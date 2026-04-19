import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getById, queryItems, remove, update } from '../cosmosdb.js'
import { getTroopContext, forbidden, unauthorized } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { updateFeedbackSchema, updateRecipeSchema, validationError } from '../schemas.js'

type ContentType = 'recipe' | 'feedback'

const CONTAINERS: Record<ContentType, string> = {
  recipe: 'recipes',
  feedback: 'feedback',
}
const anonymousSubmitter = { userId: 'anonymous', displayName: 'Unknown' }

function getContentType(value?: string): ContentType | null {
  if (value === 'recipe' || value === 'feedback') return value
  return null
}

function makePreview(type: ContentType, item: any): string {
  if (type === 'recipe') return item.description || item.name || ''
  return item.comments || item.whatWorked || item.whatToChange || ''
}

function toFlaggedItem(type: ContentType, item: any) {
  return {
    id: item.id,
    contentType: type,
    submittedBy: item.createdBy || { ...anonymousSubmitter, displayName: item.scoutName || anonymousSubmitter.displayName },
    submittedAt: item.createdAt ?? null,
    preview: makePreview(type, item),
    moderation: item.moderation || { status: 'flagged' },
    context: type === 'recipe'
      ? { name: item.name }
      : { eventId: item.eventId, mealId: item.mealId, recipeId: item.recipeId, scoutName: item.scoutName },
    content: type === 'recipe'
      ? { name: item.name, description: item.description || '' }
      : { comments: item.comments || '', whatWorked: item.whatWorked || '', whatToChange: item.whatToChange || '' },
  }
}

async function flaggedContentHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('GET /api/admin/flagged-content')
  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()
  if (!checkPermission(auth.role, 'manageTroop')) return forbidden()

  try {
    const query = 'SELECT * FROM c WHERE c.troopId = @troopId AND c.moderation.status = "flagged"'
    const parameters = [{ name: '@troopId', value: auth.troopId }]
    const [flaggedRecipes, flaggedFeedback] = await Promise.all([
      queryItems<any>(CONTAINERS.recipe, query, parameters),
      queryItems<any>(CONTAINERS.feedback, query, parameters),
    ])

    const items = [
      ...flaggedRecipes.map((item) => toFlaggedItem('recipe', item)),
      ...flaggedFeedback.map((item) => toFlaggedItem('feedback', item)),
    ].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))

    return { jsonBody: items }
  } catch (err) {
    context.error('GET /api/admin/flagged-content failed:', err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

async function flaggedContentActionHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const { contentType: contentTypeParam, id } = req.params
  const method = req.method
  context.log(`${method} /api/admin/flagged-content/${contentTypeParam}/${id}`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()
  if (!checkPermission(auth.role, 'manageTroop')) return forbidden()

  const contentType = getContentType(contentTypeParam)
  if (!contentType) return { status: 400, jsonBody: { error: 'Invalid content type' } }
  const container = CONTAINERS[contentType]

  try {
    const body = await req.json() as { action?: string; updates?: Record<string, unknown> }
    const action = body.action
    if (!action || !['approve', 'reject', 'edit'].includes(action)) {
      return { status: 400, jsonBody: { error: 'Invalid action' } }
    }

    const existing = await getById<any>(container, id, auth.troopId)
    if (!existing) return { status: 404, jsonBody: { error: 'Flagged item not found' } }

    if (existing?.moderation?.status !== 'flagged') {
      return { status: 400, jsonBody: { error: 'Item is not flagged' } }
    }

    if (action === 'reject') {
      await remove(container, id, auth.troopId)
      return { status: 204 }
    }

    let merged = existing
    if (action === 'edit') {
      if (!body.updates || typeof body.updates !== 'object') {
        return { status: 400, jsonBody: { error: 'Updates are required for edit action' } }
      }

      const candidate = { ...existing, ...body.updates }
      const parsed = (contentType === 'recipe' ? updateRecipeSchema : updateFeedbackSchema).safeParse(candidate)
      if (!parsed.success) return validationError(parsed.error)
      merged = { ...existing, ...parsed.data }
    }

    const now = Date.now()
    const updated = await update(container, id, {
      ...merged,
      id,
      troopId: auth.troopId,
      moderation: {
        ...(merged.moderation || {}),
        status: 'approved',
        reviewedAt: now,
        reviewedBy: { userId: auth.userId, displayName: auth.displayName },
      },
      updatedAt: now,
      updatedBy: { userId: auth.userId, displayName: auth.displayName },
    }, auth.troopId)

    return { jsonBody: toFlaggedItem(contentType, updated) }
  } catch (err) {
    context.error(`${method} /api/admin/flagged-content/${contentTypeParam}/${id} failed:`, err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

app.http('adminFlaggedContent', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'admin/flagged-content',
  handler: flaggedContentHandler,
})

app.http('adminFlaggedContentAction', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'admin/flagged-content/{contentType}/{id}',
  handler: flaggedContentActionHandler,
})
