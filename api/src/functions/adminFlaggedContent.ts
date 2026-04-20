import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getAllByTroop, getById, update } from '../cosmosdb.js'
import { getTroopContext, forbidden, unauthorized } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { reviewFlaggedContentSchema, validationError } from '../schemas.js'

const RECIPES_CONTAINER = 'recipes'
const FEEDBACK_CONTAINER = 'feedback'

type ContentType = 'recipe' | 'feedback'
type ReviewQueueStatus = 'flagged' | 'pending'

interface ModeratedItem {
  id: string
  troopId: string
  moderation?: {
    status?: string
    flaggedFields?: string[]
    checkedAt?: number
    reviewedAt?: number
    reviewAction?: 'approve' | 'edit' | 'reject'
    reviewedBy?: { userId: string; displayName: string }
  }
  createdAt?: number
  updatedAt?: number
  updatedBy?: { userId: string; displayName: string }
  name?: string
  description?: string
  servings?: number
  comments?: string
  whatWorked?: string
  whatToChange?: string
  eventId?: string
  recipeId?: string
  rating?: unknown
}

function formatFlagReason(item: ModeratedItem): string {
  const fields = item.moderation?.flaggedFields ?? []
  if (fields.length === 0) return 'Flagged by moderation system'
  return `Flagged fields: ${fields.join(', ')}`
}

function toFlaggedListItem(contentType: ContentType, item: ModeratedItem) {
  return {
    id: `${contentType}:${item.id}`,
    contentId: item.id,
    contentType,
    flagReason: formatFlagReason(item),
    flaggedAt: item.moderation?.checkedAt ?? item.updatedAt ?? item.createdAt ?? Date.now(),
    moderation: item.moderation,
    context: contentType === 'recipe'
      ? {
          name: item.name ?? '',
          description: item.description ?? '',
          servings: item.servings,
        }
      : {
          eventId: item.eventId,
          recipeId: item.recipeId,
          comments: item.comments ?? '',
          whatWorked: item.whatWorked ?? '',
          whatToChange: item.whatToChange ?? '',
          rating: item.rating,
        },
  }
}

function shouldIncludeInReviewQueue(item: ModeratedItem): boolean {
  const status = item.moderation?.status as ReviewQueueStatus | undefined
  return status === 'flagged' || status === 'pending'
}

function parseReviewTarget(idParam: string): { contentType: ContentType; contentId: string } | null {
  const [type, ...rest] = idParam.split(':')
  if ((type === 'recipe' || type === 'feedback') && rest.length > 0) {
    return { contentType: type, contentId: rest.join(':') }
  }
  return null
}

async function resolveItem(
  idParam: string,
  troopId: string,
): Promise<
  | { status: 'ok'; contentType: ContentType; item: ModeratedItem }
  | { status: 'ambiguous' }
  | { status: 'not_found' }
> {
  const typedTarget = parseReviewTarget(idParam)
  if (typedTarget) {
    const container = typedTarget.contentType === 'recipe' ? RECIPES_CONTAINER : FEEDBACK_CONTAINER
    const item = await getById<ModeratedItem>(container, typedTarget.contentId, troopId)
    if (!item) return { status: 'not_found' }
    return { status: 'ok', contentType: typedTarget.contentType, item }
  }

  const recipe = await getById<ModeratedItem>(RECIPES_CONTAINER, idParam, troopId)
  const feedback = await getById<ModeratedItem>(FEEDBACK_CONTAINER, idParam, troopId)
  if (recipe && feedback) return { status: 'ambiguous' }
  if (recipe) return { status: 'ok', contentType: 'recipe', item: recipe }
  if (feedback) return { status: 'ok', contentType: 'feedback', item: feedback }
  return { status: 'not_found' }
}

async function adminFlaggedContentHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const method = req.method
  context.log(`${method} /api/admin/flagged-content${id ? `/${id}` : ''}`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()
  if (!checkPermission(auth.role, 'manageTroop')) return forbidden()

  try {
    if (method === 'GET' && !id) {
      const [recipes, feedback] = await Promise.all([
        getAllByTroop<ModeratedItem>(RECIPES_CONTAINER, auth.troopId),
        getAllByTroop<ModeratedItem>(FEEDBACK_CONTAINER, auth.troopId),
      ])

      const flagged = [
        ...recipes
          .filter(shouldIncludeInReviewQueue)
          .map((item) => toFlaggedListItem('recipe', item)),
        ...feedback
          .filter(shouldIncludeInReviewQueue)
          .map((item) => toFlaggedListItem('feedback', item)),
      ].sort((a, b) => b.flaggedAt - a.flaggedAt)

      return { status: 200, jsonBody: flagged }
    }

    if (method === 'PUT' && id) {
      const parsed = reviewFlaggedContentSchema.safeParse(await req.json())
      if (!parsed.success) return validationError(parsed.error)

      const resolved = await resolveItem(id, auth.troopId)
      if (resolved.status === 'ambiguous') {
        return { status: 409, jsonBody: { error: 'Ambiguous content id. Use contentType:id format.' } }
      }
      if (resolved.status === 'not_found') {
        return { status: 404, jsonBody: { error: 'Flagged content not found' } }
      }

      const now = Date.now()
      const audit = { userId: auth.userId, displayName: auth.displayName }
      const container = resolved.contentType === 'recipe' ? RECIPES_CONTAINER : FEEDBACK_CONTAINER

      const moderation = {
        ...(resolved.item.moderation ?? {}),
        checkedAt: now,
        reviewedAt: now,
        reviewedBy: audit,
        reviewAction: parsed.data.action,
      }

      const updatedBase: ModeratedItem = {
        ...resolved.item,
        id: resolved.item.id,
        troopId: auth.troopId,
        moderation: parsed.data.action === 'reject'
          ? { ...moderation, status: 'flagged' }
          : { ...moderation, status: 'approved', flaggedFields: [] },
        updatedAt: now,
        updatedBy: audit,
      }

      if (parsed.data.action === 'edit') {
        if (resolved.contentType === 'recipe') {
          if (typeof parsed.data.edits.name === 'string') updatedBase.name = parsed.data.edits.name
          if (typeof parsed.data.edits.description === 'string') updatedBase.description = parsed.data.edits.description
        } else {
          if (typeof parsed.data.edits.comments === 'string') updatedBase.comments = parsed.data.edits.comments
          if (typeof parsed.data.edits.whatWorked === 'string') updatedBase.whatWorked = parsed.data.edits.whatWorked
          if (typeof parsed.data.edits.whatToChange === 'string') updatedBase.whatToChange = parsed.data.edits.whatToChange
        }
      }

      const updated = await update<ModeratedItem>(container, resolved.item.id, updatedBase, auth.troopId)
      return {
        jsonBody: {
          id: `${resolved.contentType}:${updated.id}`,
          contentId: updated.id,
          contentType: resolved.contentType,
          action: parsed.data.action,
          moderation: updated.moderation,
        },
      }
    }

    return { status: 405, jsonBody: { error: 'Method not allowed' } }
  } catch (err) {
    context.error(`${method} /api/admin/flagged-content${id ? `/${id}` : ''} failed:`, err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

app.http('adminFlaggedContent', {
  methods: ['GET', 'PUT'],
  authLevel: 'anonymous',
  route: 'admin/flagged-content/{id?}',
  handler: adminFlaggedContentHandler,
})
