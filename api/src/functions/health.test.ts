import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock the Azure Functions app registration so importing doesn't try to bind a host ──
vi.mock('@azure/functions', () => ({
  app: { http: vi.fn() },
}))

// ── Mock cosmosdb ──
vi.mock('../cosmosdb.js', () => ({
  initDatabase: vi.fn(),
}))

import { app } from '@azure/functions'
import { initDatabase } from '../cosmosdb.js'
import './health.js'

// Pull the handler out of the registered app.http() call
const registrations = vi.mocked(app.http).mock.calls
const healthCall = registrations.find(([name]) => name === 'health')
const handler = healthCall?.[1].handler as () => Promise<any>

beforeEach(() => {
  vi.mocked(initDatabase).mockReset()
})

describe('health handler', () => {
  it('returns healthy when initDatabase succeeds', async () => {
    vi.mocked(initDatabase).mockResolvedValueOnce(undefined)
    const result = await handler()
    expect(result).toEqual({ jsonBody: { status: 'healthy' } })
  })

  it('returns 503 unhealthy when initDatabase throws', async () => {
    vi.mocked(initDatabase).mockRejectedValueOnce(new Error('cosmos down'))
    const result = await handler()
    expect(result).toEqual({ status: 503, jsonBody: { status: 'unhealthy' } })
  })

  it('registers a GET route at /health', () => {
    expect(healthCall).toBeDefined()
    expect(healthCall?.[1]).toMatchObject({
      methods: ['GET'],
      route: 'health',
      authLevel: 'anonymous',
    })
  })
})
