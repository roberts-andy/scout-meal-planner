import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getAll, getById, create, update, remove } from '../cosmosdb.js'

const CONTAINER = 'recipes'

async function recipesHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const method = req.method

  try {
    if (method === 'GET' && !id) {
      const recipes = await getAll(CONTAINER)
      return { jsonBody: recipes }
    }

    if (method === 'GET' && id) {
      const recipe = await getById(CONTAINER, id)
      if (!recipe) return { status: 404, jsonBody: { error: 'Recipe not found' } }
      return { jsonBody: recipe }
    }

    if (method === 'POST') {
      const body = await req.json() as any
      const recipe = await create(CONTAINER, body)
      return { status: 201, jsonBody: recipe }
    }

    if (method === 'PUT' && id) {
      const body = await req.json() as any
      const recipe = await update(CONTAINER, id, body)
      return { jsonBody: recipe }
    }

    if (method === 'DELETE' && id) {
      await remove(CONTAINER, id)
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
