import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getAllByTroop, getById, create, update, remove, queryItems } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { createFeedbackSchema, updateFeedbackSchema, validationError } from '../schemas.js'
import { canViewModeratedContent, moderateTextFields } from '../middleware/moderation.js'

const CONTAINER = 'feedback'

async function feedbackHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const method = req.method
  context.log(`${method} /api/feedback${id ? '/' + id : ''}`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()

  try {
    if (method === 'GET' && !id) {
      const feedback = await getAllByTroop(CONTAINER, auth.troopId)
      return { jsonBody: feedback.filter((entry) => canViewModeratedContent(auth.role, entry.moderation)) }
    }

    if (method === 'POST') {
      if (!checkPermission(auth.role, 'submitFeedback')) return forbidden()
      const parsed = createFeedbackSchema.safeParse(await req.json())
      if (!parsed.success) return validationError(parsed.error)
      const now = Date.now()
      const audit = { userId: auth.userId, displayName: auth.displayName }
      const moderation = await moderateTextFields([
        { field: 'comments', text: parsed.data.comments },
        { field: 'whatWorked', text: parsed.data.whatWorked },
        { field: 'whatToChange', text: parsed.data.whatToChange },
      ], context)
      const feedback = await create(CONTAINER, {
        id: crypto.randomUUID(),
        troopId: auth.troopId,
        ...parsed.data,
        moderation,
        createdAt: now,
        updatedAt: now,
        createdBy: audit,
        updatedBy: audit,
      })
      return { status: 201, jsonBody: feedback }
    }

    if (method === 'PUT' && id) {
      if (!checkPermission(auth.role, 'submitFeedback')) return forbidden()
      const parsed = updateFeedbackSchema.safeParse(await req.json())
      if (!parsed.success) return validationError(parsed.error)
      const existing = await getById(CONTAINER, id, auth.troopId)
      if (!existing) return { status: 404, jsonBody: { error: 'Feedback not found' } }
      const moderation = await moderateTextFields([
        { field: 'comments', text: parsed.data.comments },
        { field: 'whatWorked', text: parsed.data.whatWorked },
        { field: 'whatToChange', text: parsed.data.whatToChange },
      ], context)
      const feedback = await update(CONTAINER, id, {
        ...existing,
        ...parsed.data,
        id,
        troopId: auth.troopId,
        moderation,
        updatedAt: Date.now(),
        updatedBy: { userId: auth.userId, displayName: auth.displayName },
      }, auth.troopId)
      return { jsonBody: feedback }
    }

    if (method === 'DELETE' && id) {
      if (!checkPermission(auth.role, 'manageEvents')) return forbidden()
      await remove(CONTAINER, id, auth.troopId)
      return { status: 204 }
    }

    return { status: 405, jsonBody: { error: 'Method not allowed' } }
  } catch (err) {
    context.error(`${method} /api/feedback${id ? '/' + id : ''} failed:`, err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

async function feedbackByEventHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const eventId = req.params.eventId
  context.log(`GET /api/feedback/event/${eventId}`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()

  try {
    const feedback = await queryItems(
      CONTAINER,
      'SELECT * FROM c WHERE c.eventId = @eventId AND c.troopId = @troopId',
      [
        { name: '@eventId', value: eventId },
        { name: '@troopId', value: auth.troopId },
      ]
    )
    return { jsonBody: feedback.filter((entry: any) => canViewModeratedContent(auth.role, entry.moderation)) }
  } catch (err) {
    context.error(`GET /api/feedback/event/${eventId} failed:`, err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

app.http('feedback', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'feedback/{id?}',
  handler: feedbackHandler,
})

app.http('feedbackByEvent', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'feedback/event/{eventId}',
  handler: feedbackByEventHandler,
})
