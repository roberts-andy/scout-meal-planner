import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getAllByTroop, getById, create, update, remove } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'

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
      const body = await req.json() as any
      body.troopId = auth.troopId
      body.createdBy = { userId: auth.userId, displayName: auth.displayName }
      body.updatedBy = body.createdBy
      const event = await create(CONTAINER, body)
      return { status: 201, jsonBody: event }
    }

    if (method === 'PUT' && id) {
      if (!checkPermission(auth.role, 'manageEvents')) return forbidden()
      const body = await req.json() as any
      body.troopId = auth.troopId
      body.updatedBy = { userId: auth.userId, displayName: auth.displayName }
      const event = await update(CONTAINER, id, body, auth.troopId)
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
