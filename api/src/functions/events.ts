import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getAll, getById, create, update, remove } from '../cosmosdb.js'

const CONTAINER = 'events'

async function eventsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const method = req.method

  try {
    if (method === 'GET' && !id) {
      const events = await getAll(CONTAINER)
      return { jsonBody: events }
    }

    if (method === 'GET' && id) {
      const event = await getById(CONTAINER, id)
      if (!event) return { status: 404, jsonBody: { error: 'Event not found' } }
      return { jsonBody: event }
    }

    if (method === 'POST') {
      const body = await req.json() as any
      const event = await create(CONTAINER, body)
      return { status: 201, jsonBody: event }
    }

    if (method === 'PUT' && id) {
      const body = await req.json() as any
      const event = await update(CONTAINER, id, body)
      return { jsonBody: event }
    }

    if (method === 'DELETE' && id) {
      await remove(CONTAINER, id)
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
