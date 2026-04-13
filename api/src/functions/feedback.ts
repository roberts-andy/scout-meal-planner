import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getAll, create, update, remove, queryItems } from '../cosmosdb.js'

const CONTAINER = 'feedback'

async function feedbackHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const method = req.method

  try {
    if (method === 'GET' && !id) {
      const feedback = await getAll(CONTAINER)
      return { jsonBody: feedback }
    }

    if (method === 'POST') {
      const body = await req.json() as any
      const feedback = await create(CONTAINER, body)
      return { status: 201, jsonBody: feedback }
    }

    if (method === 'PUT' && id) {
      const body = await req.json() as any
      const { eventId } = body
      const feedback = await update(CONTAINER, id, body, eventId)
      return { jsonBody: feedback }
    }

    if (method === 'DELETE' && id) {
      const eventId = req.query.get('eventId')
      if (!eventId) return { status: 400, jsonBody: { error: 'eventId query parameter required' } }
      await remove(CONTAINER, id, eventId)
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

  try {
    const feedback = await queryItems(
      CONTAINER,
      'SELECT * FROM c WHERE c.eventId = @eventId',
      [{ name: '@eventId', value: eventId }]
    )
    return { jsonBody: feedback }
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
