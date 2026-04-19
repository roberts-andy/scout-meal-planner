import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getById, queryItems, remove, update } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'

type ContentType = 'recipe' | 'feedback'
type ReviewAction = 'approve' | 'reject'

interface ModeratedItem {
  id: string
  createdAt?: number
  createdBy?: {
    displayName?: string
    userId?: string
  }
  moderation?: {
    status?: string
    reviewedAt?: number
    reviewedBy?: {
      userId?: string
      displayName?: string
    }
  }
}

interface ModeratedRecipe extends ModeratedItem {
  name?: string
  variations?: Array<{
    instructions?: string[]
  }>
}

interface ModeratedFeedback extends ModeratedItem {
  comments?: string
  whatWorked?: string
  whatToChange?: string
  scoutName?: string
}

const containerByType: Record<ContentType, string> = {
  recipe: 'recipes',
  feedback: 'feedback',
}

function isContentType(value: string | undefined): value is ContentType {
  return value === 'recipe' || value === 'feedback'
}

function buildPreview(contentType: ContentType, item: ModeratedRecipe | ModeratedFeedback): string {
  if (contentType === 'recipe') {
    const recipe = item as ModeratedRecipe
    const instructions = Array.isArray(recipe.variations)
      ? recipe.variations.flatMap((variation) => Array.isArray(variation.instructions) ? variation.instructions : [])
      : []
    const instructionPreview = instructions.slice(0, 2).join(' ')
    return [recipe.name, instructionPreview].filter(Boolean).join(' — ')
  }

  const feedback = item as ModeratedFeedback
  const feedbackParts = [feedback.comments, feedback.whatWorked, feedback.whatToChange]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
  return feedbackParts.join(' • ')
}

async function adminFlaggedContentHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const method = req.method
  const contentTypeParam = req.params.contentType
  const id = req.params.id
  context.log(`${method} /api/admin/flagged-content`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()
  if (!checkPermission(auth.role, 'manageTroop')) return forbidden()

  try {
    if (method === 'GET') {
      const [flaggedRecipes, flaggedFeedback] = await Promise.all([
        queryItems<ModeratedRecipe>(
          'recipes',
          'SELECT * FROM c WHERE c.troopId = @troopId AND IS_DEFINED(c.moderation.status) AND c.moderation.status = @status',
          [
            { name: '@troopId', value: auth.troopId },
            { name: '@status', value: 'flagged' },
          ],
        ),
        queryItems<ModeratedFeedback>(
          'feedback',
          'SELECT * FROM c WHERE c.troopId = @troopId AND IS_DEFINED(c.moderation.status) AND c.moderation.status = @status',
          [
            { name: '@troopId', value: auth.troopId },
            { name: '@status', value: 'flagged' },
          ],
        ),
      ])

      const items = [
        ...flaggedRecipes.map((item) => ({
          contentType: 'recipe' as const,
          id: item.id,
          submittedBy: item.createdBy?.displayName || 'Unknown',
          submittedByUserId: item.createdBy?.userId || '',
          submittedAt: item.createdAt ?? null,
          preview: buildPreview('recipe', item),
          content: item,
        })),
        ...flaggedFeedback.map((item) => ({
          contentType: 'feedback' as const,
          id: item.id,
          submittedBy: item.createdBy?.displayName || item.scoutName || 'Unknown',
          submittedByUserId: item.createdBy?.userId || '',
          submittedAt: item.createdAt ?? null,
          preview: buildPreview('feedback', item),
          content: item,
        })),
      ].sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))

      return { jsonBody: items }
    }

    if (method === 'PUT') {
      if (!isContentType(contentTypeParam) || !id) {
        return { status: 400, jsonBody: { error: 'contentType and id are required in route parameters' } }
      }

      let payload: { action?: ReviewAction } | null = null
      try {
        payload = await req.json() as { action?: ReviewAction }
      } catch (err) {
        context.error('PUT /api/admin/flagged-content invalid JSON body:', err)
        return { status: 400, jsonBody: { error: 'Invalid JSON request body' } }
      }
      if (!payload || (payload.action !== 'approve' && payload.action !== 'reject')) {
        return { status: 400, jsonBody: { error: 'action must be "approve" or "reject"' } }
      }

      const container = containerByType[contentTypeParam]
      const existing = await getById<ModeratedItem & Record<string, unknown>>(container, id, auth.troopId)
      if (!existing) return { status: 404, jsonBody: { error: 'Flagged content not found' } }

      if (payload.action === 'reject') {
        await remove(container, id, auth.troopId)
        return { status: 204 }
      }

      const now = Date.now()
      await update(container, id, {
        ...existing,
        moderation: {
          ...existing.moderation,
          status: 'approved',
          reviewedAt: now,
          reviewedBy: { userId: auth.userId, displayName: auth.displayName },
        },
        updatedAt: now,
        updatedBy: { userId: auth.userId, displayName: auth.displayName },
      }, auth.troopId)

      return { jsonBody: { id, contentType: contentTypeParam, status: 'approved' } }
    }

    return { status: 405, jsonBody: { error: 'Method not allowed' } }
  } catch (err) {
    context.error(`${method} /api/admin/flagged-content failed:`, err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

app.http('adminFlaggedContent', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  route: 'admin/flagged-content/{contentType?}/{id?}',
  handler: adminFlaggedContentHandler,
})
