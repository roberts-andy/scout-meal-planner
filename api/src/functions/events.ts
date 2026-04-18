import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getAllByTroop, getById, create, update, remove } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { createEventSchema, updateEventSchema, validationError } from '../schemas.js'
import { moderateContent, moderationError, eventTextFields } from '../middleware/moderation.js'

const CONTAINER = 'events'

async function eventsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const method = req.method
  context.log(`${method} /api/events${id ? '/' + id : ''}`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()

  try {
    if (method === 'GET' && !id) {
      const events = await getAllByTroop(CONTAINER, auth.troopId)
      return { jsonBody: events }
    }

    if (method === 'GET' && id) {
      const event = await getById(CONTAINER, id, auth.troopId)
      if (!event) return { status: 404, jsonBody: { error: 'Event not found' } }
      return { jsonBody: event }
    }

    if (method === 'POST') {
      if (!checkPermission(auth.role, 'manageEvents')) return forbidden()
      const parsed = createEventSchema.safeParse(await req.json())
      if (!parsed.success) return validationError(parsed.error)
      const moderation = await moderateContent(eventTextFields(parsed.data))
      if (moderation.status === 'flagged') return moderationError(moderation)
      const now = Date.now()
      const audit = { userId: auth.userId, displayName: auth.displayName }
      const event = await create(CONTAINER, {
        id: crypto.randomUUID(),
        troopId: auth.troopId,
        ...parsed.data,
        moderationStatus: moderation.status,
        createdAt: now,
        updatedAt: now,
        createdBy: audit,
        updatedBy: audit,
      })
      return { status: 201, jsonBody: event }
    }

    if (method === 'PUT' && id) {
      if (!checkPermission(auth.role, 'manageEvents')) return forbidden()
      const parsed = updateEventSchema.safeParse(await req.json())
      if (!parsed.success) return validationError(parsed.error)
      const moderation = await moderateContent(eventTextFields(parsed.data))
      if (moderation.status === 'flagged') return moderationError(moderation)
      const existing = await getById(CONTAINER, id, auth.troopId)
      if (!existing) return { status: 404, jsonBody: { error: 'Event not found' } }
      const event = await update(CONTAINER, id, {
        ...existing,
        ...parsed.data,
        id,
        troopId: auth.troopId,
        moderationStatus: moderation.status,
        updatedAt: Date.now(),
        updatedBy: { userId: auth.userId, displayName: auth.displayName },
      }, auth.troopId)
      return { jsonBody: event }
    }

    if (method === 'DELETE' && id) {
      if (!checkPermission(auth.role, 'manageEvents')) return forbidden()
      await remove(CONTAINER, id, auth.troopId)
      return { status: 204 }
    }

    return { status: 405, jsonBody: { error: 'Method not allowed' } }
  } catch (err) {
    context.error(`${method} /api/events${id ? '/' + id : ''} failed:`, err)
    const message = err instanceof Error ? err.message : String(err)
    return { status: 500, jsonBody: { error: message } }
  }
}

app.http('events', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'events/{id?}',
  handler: eventsHandler,
})
