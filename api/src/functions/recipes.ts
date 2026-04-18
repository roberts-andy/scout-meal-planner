import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getAllByTroop, getById, create, update, remove } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { createRecipeSchema, updateRecipeSchema, validationError } from '../schemas.js'
import { moderateContent, moderationError, recipeTextFields } from '../middleware/moderation.js'

const CONTAINER = 'recipes'

async function recipesHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const method = req.method
  context.log(`${method} /api/recipes${id ? '/' + id : ''}`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()

  try {
    if (method === 'GET' && !id) {
      const recipes = await getAllByTroop(CONTAINER, auth.troopId)
      return { jsonBody: recipes }
    }

    if (method === 'GET' && id) {
      const recipe = await getById(CONTAINER, id, auth.troopId)
      if (!recipe) return { status: 404, jsonBody: { error: 'Recipe not found' } }
      return { jsonBody: recipe }
    }

    if (method === 'POST') {
      if (!checkPermission(auth.role, 'manageRecipes')) return forbidden()
      const parsed = createRecipeSchema.safeParse(await req.json())
      if (!parsed.success) return validationError(parsed.error)
      const moderation = await moderateContent(recipeTextFields(parsed.data))
      if (moderation.status === 'flagged') return moderationError(moderation)
      const now = Date.now()
      const audit = { userId: auth.userId, displayName: auth.displayName }
      const recipe = await create(CONTAINER, {
        id: crypto.randomUUID(),
        troopId: auth.troopId,
        ...parsed.data,
        moderationStatus: moderation.status,
        createdAt: now,
        updatedAt: now,
        createdBy: audit,
        updatedBy: audit,
      })
      return { status: 201, jsonBody: recipe }
    }

    if (method === 'PUT' && id) {
      if (!checkPermission(auth.role, 'manageRecipes')) return forbidden()
      const parsed = updateRecipeSchema.safeParse(await req.json())
      if (!parsed.success) return validationError(parsed.error)
      const moderation = await moderateContent(recipeTextFields(parsed.data))
      if (moderation.status === 'flagged') return moderationError(moderation)
      const existing = await getById(CONTAINER, id, auth.troopId)
      if (!existing) return { status: 404, jsonBody: { error: 'Recipe not found' } }
      const recipe = await update(CONTAINER, id, {
        ...existing,
        ...parsed.data,
        id,
        troopId: auth.troopId,
        moderationStatus: moderation.status,
        updatedAt: Date.now(),
        updatedBy: { userId: auth.userId, displayName: auth.displayName },
      }, auth.troopId)
      return { jsonBody: recipe }
    }

    if (method === 'DELETE' && id) {
      if (!checkPermission(auth.role, 'manageRecipes')) return forbidden()
      await remove(CONTAINER, id, auth.troopId)
      return { status: 204 }
    }

    return { status: 405, jsonBody: { error: 'Method not allowed' } }
  } catch (err) {
    context.error(`${method} /api/recipes${id ? '/' + id : ''} failed:`, err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

app.http('recipes', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'recipes/{id?}',
  handler: recipesHandler,
})
