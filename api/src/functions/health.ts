import { app, HttpResponseInit } from '@azure/functions'
import { initDatabase } from '../cosmosdb.js'

async function healthHandler(): Promise<HttpResponseInit> {
  try {
    await initDatabase()
    return { jsonBody: { status: 'healthy' } }
  } catch {
    return { status: 503, jsonBody: { status: 'unhealthy' } }
  }
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: healthHandler,
})
