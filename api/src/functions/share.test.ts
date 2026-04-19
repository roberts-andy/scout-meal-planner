import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpRequest } from '@azure/functions'

const { registeredHandlers } = vi.hoisted(() => ({
  registeredHandlers: {} as Record<string, any>,
}))

vi.mock('@azure/functions', () => ({
  app: {
    http: vi.fn((name: string, options: any) => {
      registeredHandlers[name] = options.handler
    }),
  },
}))

vi.mock('../cosmosdb.js', () => ({
  getById: vi.fn(),
  update: vi.fn(),
  queryItems: vi.fn(),
  getAllByTroop: vi.fn(),
}))

vi.mock('../middleware/auth.js', async () => {
  const actual = await vi.importActual<any>('../middleware/auth.js')
  return {
    ...actual,
    getTroopContext: vi.fn(),
  }
})

import * as cosmos from '../cosmosdb.js'
import { getTroopContext } from '../middleware/auth.js'
import './share.js'

const shareHandler = registeredHandlers['eventShare'] as (req: HttpRequest, ctx: any) => Promise<any>
const sharedEventHandler = registeredHandlers['sharedEvent'] as (req: HttpRequest, ctx: any) => Promise<any>

function makeReq(opts: {
  method: string
  params?: Record<string, string>
  url?: string
}): HttpRequest {
  return {
    method: opts.method,
    params: opts.params ?? {},
    url: opts.url ?? 'https://example.com/api/events/e1/share',
    headers: { get: () => null },
    json: () => Promise.resolve({}),
  } as unknown as HttpRequest
}

const ctx = { log: vi.fn(), error: vi.fn() } as any

const adminAuth = {
  userId: 'user-1',
  email: 'admin@example.com',
  displayName: 'Admin',
  troopId: 'troop-42',
  role: 'troopAdmin',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('eventShare handler', () => {
  it('returns 401 when auth context is missing', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(null)
    const result = await shareHandler(makeReq({ method: 'POST', params: { id: 'e1' } }), ctx)
    expect(result.status).toBe(401)
  })

  it('returns current link when token exists', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({ id: 'e1', shareToken: 'token-1' })
    const result = await shareHandler(makeReq({ method: 'GET', params: { id: 'e1' } }), ctx)
    expect(result.jsonBody).toEqual({
      shareToken: 'token-1',
      shareUrl: 'https://example.com/share/token-1',
    })
  })

  it('regenerates token and updates event', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({ id: 'e1', troopId: 'troop-42' })
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)
    const result = await shareHandler(makeReq({ method: 'POST', params: { id: 'e1' } }), ctx)
    expect(result.jsonBody.shareToken).toBeTruthy()
    expect(result.jsonBody.shareUrl).toContain('/share/')
    expect(cosmos.update).toHaveBeenCalledTimes(1)
  })

  it('revokes token with DELETE', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({ id: 'e1', troopId: 'troop-42', shareToken: 'token-1' })
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)
    const result = await shareHandler(makeReq({ method: 'DELETE', params: { id: 'e1' } }), ctx)
    expect(result.status).toBe(204)
    const updated = vi.mocked(cosmos.update).mock.calls[0][2] as any
    expect(updated.shareToken).toBeUndefined()
  })
})

describe('sharedEvent handler', () => {
  it('returns sanitized event and recipes for valid token', async () => {
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([{
      id: 'e1',
      troopId: 'troop-42',
      name: 'Camp',
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      days: [{ date: '2026-01-01', meals: [{ id: 'm1', type: 'dinner', recipeId: 'r1', scoutCount: 8 }] }],
      createdBy: { displayName: 'Private Name' },
    }])
    vi.mocked(cosmos.getAllByTroop).mockResolvedValueOnce([{
      id: 'r1',
      name: 'Stew',
      servings: 8,
      ingredients: [{ id: 'i1', name: 'Beans', quantity: 2, unit: 'can' }],
      variations: [{ id: 'v1', equipment: ['Pot'] }],
      createdBy: { displayName: 'Private Name' },
    }])

    const result = await sharedEventHandler(makeReq({ method: 'GET', params: { token: 'token-1' }, url: 'https://example.com/api/share/token-1' }), ctx)
    expect(result.jsonBody.event.name).toBe('Camp')
    expect(result.jsonBody.event.createdBy).toBeUndefined()
    expect(result.jsonBody.recipes[0].createdBy).toBeUndefined()
  })

  it('returns 404 for unknown token', async () => {
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([])
    const result = await sharedEventHandler(makeReq({ method: 'GET', params: { token: 'missing' }, url: 'https://example.com/api/share/missing' }), ctx)
    expect(result.status).toBe(404)
  })
})
