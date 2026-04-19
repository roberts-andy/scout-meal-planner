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
import './eventPurchased.js'

const handler = registeredHandlers['eventPurchased'] as (req: HttpRequest, ctx: any) => Promise<any>

function makeReq(body: any, id = 'e1'): HttpRequest {
  return {
    method: 'PATCH',
    params: { id },
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as HttpRequest
}

const ctx = { log: vi.fn(), error: vi.fn() } as any

const scoutAuth = {
  userId: 'user-2',
  email: 'scout@example.com',
  displayName: 'Scout',
  troopId: 'troop-42',
  role: 'scout',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('event purchased handler', () => {
  it('returns 401 when no auth context', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(null)
    const result = await handler(makeReq({ item: 'salt-tsp', purchased: true }), ctx)
    expect(result.status).toBe(401)
  })

  it('returns 400 for invalid body', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    const result = await handler(makeReq({ item: '', purchased: true }), ctx)
    expect(result.status).toBe(400)
    expect(cosmos.update).not.toHaveBeenCalled()
  })

  it('returns 404 when event does not exist in troop', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce(undefined)
    const result = await handler(makeReq({ item: 'salt-tsp', purchased: true }), ctx)
    expect(result.status).toBe(404)
    expect(cosmos.update).not.toHaveBeenCalled()
  })

  it('adds item to purchasedItems when purchased=true', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'e1',
      troopId: 'troop-42',
      purchasedItems: ['beans-can'],
    } as any)
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)

    const result = await handler(makeReq({ item: 'salt-tsp', purchased: true }), ctx)
    expect(result.jsonBody.purchasedItems).toEqual(['beans-can', 'salt-tsp'])
    expect(cosmos.update).toHaveBeenCalledWith(
      'events',
      'e1',
      expect.objectContaining({
        id: 'e1',
        troopId: 'troop-42',
        purchasedItems: ['beans-can', 'salt-tsp'],
        updatedBy: { userId: 'user-2', displayName: 'Scout' },
      }),
      'troop-42'
    )
  })

  it('removes item from purchasedItems when purchased=false', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'e1',
      troopId: 'troop-42',
      purchasedItems: ['beans-can', 'salt-tsp'],
    } as any)
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)

    const result = await handler(makeReq({ item: 'salt-tsp', purchased: false }), ctx)
    expect(result.jsonBody.purchasedItems).toEqual(['beans-can'])
  })
})
