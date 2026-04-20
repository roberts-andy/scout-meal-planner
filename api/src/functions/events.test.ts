import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpRequest } from '@azure/functions'

// ── Mock Azure Functions registration ──
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

// ── Mock cosmosdb ──
vi.mock('../cosmosdb.js', () => ({
  getAllByTroop: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  queryItems: vi.fn(),
  remove: vi.fn(),
}))

// ── Mock auth middleware ──
vi.mock('../middleware/auth.js', async () => {
  const actual = await vi.importActual<any>('../middleware/auth.js')
  return {
    ...actual,
    getTroopContext: vi.fn(),
  }
})

import * as cosmos from '../cosmosdb.js'
import { getTroopContext } from '../middleware/auth.js'
import './events.js'

const handler = registeredHandlers['events'] as (req: HttpRequest, ctx: any) => Promise<any>

function makeReq(opts: {
  method: string
  params?: Record<string, string>
  body?: any
}): HttpRequest {
  return {
    method: opts.method,
    params: opts.params ?? {},
    headers: { get: () => null },
    json: () => Promise.resolve(opts.body),
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

const scoutAuth = {
  userId: 'user-2',
  email: 'scout@example.com',
  displayName: 'Scout',
  troopId: 'troop-42',
  role: 'scout',
}

const validEventBody = {
  name: 'Summer Camp',
  startDate: '2026-07-01',
  endDate: '2026-07-05',
  days: [{ date: '2026-07-01', meals: [{ id: 'm1', type: 'breakfast', scoutCount: 8 }] }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('events handler — auth', () => {
  it('returns 401 when no auth context', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(null)
    const result = await handler(makeReq({ method: 'GET' }), ctx)
    expect(result.status).toBe(401)
  })
})

describe('events handler — GET', () => {
  it('scopes list to caller troopId', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getAllByTroop).mockResolvedValueOnce([{ id: 'e1' }])
    const result = await handler(makeReq({ method: 'GET' }), ctx)
    expect(cosmos.getAllByTroop).toHaveBeenCalledWith('events', 'troop-42')
    expect(result.jsonBody).toEqual([{ id: 'e1' }])
  })

  it('returns 404 when event not found', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce(undefined)
    const result = await handler(makeReq({ method: 'GET', params: { id: 'missing' } }), ctx)
    expect(result.status).toBe(404)
  })
})

describe('events handler — POST', () => {
  it('returns 403 when caller lacks manageEvents permission', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    const result = await handler(makeReq({ method: 'POST', body: validEventBody }), ctx)
    expect(result.status).toBe(403)
    expect(cosmos.create).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid body', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    const result = await handler(makeReq({ method: 'POST', body: { name: '' } }), ctx)
    expect(result.status).toBe(400)
    expect(cosmos.create).not.toHaveBeenCalled()
  })

  it('generates server-side id and stamps troopId from auth context', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.create).mockImplementationOnce(async (_c, item) => item as any)
    const maliciousBody = { ...validEventBody, id: 'client-id', troopId: 'OTHER-TROOP', createdBy: { userId: 'hacker' } }
    const result = await handler(makeReq({ method: 'POST', body: maliciousBody }), ctx)
    expect(result.status).toBe(201)
    const created = vi.mocked(cosmos.create).mock.calls[0][1] as any
    expect(created.id).not.toBe('client-id')
    expect(created.id).toMatch(/^[0-9a-f-]+$/)
    expect(created.troopId).toBe('troop-42')
    expect(created.createdBy).toEqual({ userId: 'user-1', displayName: 'Admin' })
    expect(created.updatedBy).toEqual({ userId: 'user-1', displayName: 'Admin' })
  })
})

describe('events handler — PUT', () => {
  it('returns 403 when caller lacks permission', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    const result = await handler(makeReq({ method: 'PUT', params: { id: 'e1' }, body: validEventBody }), ctx)
    expect(result.status).toBe(403)
  })

  it('returns 404 when event does not exist in troop', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce(undefined)
    const result = await handler(makeReq({ method: 'PUT', params: { id: 'e1' }, body: validEventBody }), ctx)
    expect(result.status).toBe(404)
    expect(cosmos.update).not.toHaveBeenCalled()
  })

  it('reads existing document, merges validated fields, and pins id + troopId', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'e1',
      troopId: 'troop-42',
      name: 'Old Name',
      createdAt: 1000,
      createdBy: { userId: 'original', displayName: 'Original' },
    } as any)
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)

    const maliciousBody = { ...validEventBody, id: 'DIFFERENT', troopId: 'OTHER-TROOP' }
    const result = await handler(makeReq({ method: 'PUT', params: { id: 'e1' }, body: maliciousBody }), ctx)

    expect(result.jsonBody).toBeDefined()
    const call = vi.mocked(cosmos.update).mock.calls[0]
    expect(call[1]).toBe('e1')
    const merged = call[2] as any
    expect(merged.id).toBe('e1')
    expect(merged.troopId).toBe('troop-42')
    expect(merged.createdAt).toBe(1000) // preserved from existing
    expect(merged.createdBy).toEqual({ userId: 'original', displayName: 'Original' }) // preserved
    expect(merged.updatedBy).toEqual({ userId: 'user-1', displayName: 'Admin' }) // stamped from auth
    expect(merged.name).toBe('Summer Camp') // from body
  })

  it('read-before-write guards against cross-tenant updates', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    // Cosmos returns undefined when the item is not in the caller's troop partition
    vi.mocked(cosmos.getById).mockResolvedValueOnce(undefined)
    await handler(makeReq({ method: 'PUT', params: { id: 'other-troop-event' }, body: validEventBody }), ctx)
    // Must never have called update in this case
    expect(cosmos.update).not.toHaveBeenCalled()
  })
})

describe('events handler — DELETE', () => {
  it('returns 403 when caller lacks permission', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    const result = await handler(makeReq({ method: 'DELETE', params: { id: 'e1' } }), ctx)
    expect(result.status).toBe(403)
    expect(cosmos.remove).not.toHaveBeenCalled()
  })

  it('removes scoped to caller troopId', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([])
    vi.mocked(cosmos.remove).mockResolvedValueOnce(undefined)
    const result = await handler(makeReq({ method: 'DELETE', params: { id: 'e1' } }), ctx)
    expect(result.status).toBe(204)
    expect(cosmos.queryItems).toHaveBeenCalledWith(
      'feedback',
      'SELECT c.id FROM c WHERE c.eventId = @eventId AND c.troopId = @troopId',
      [
        { name: '@eventId', value: 'e1' },
        { name: '@troopId', value: 'troop-42' },
      ],
    )
    expect(cosmos.remove).toHaveBeenCalledWith('events', 'e1', 'troop-42')
  })

  it('deletes all feedback for the event before deleting the event', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'f1' },
      { id: 'f2' },
      { id: 'f3' },
    ])
    vi.mocked(cosmos.remove).mockResolvedValue(undefined)

    const result = await handler(makeReq({ method: 'DELETE', params: { id: 'e1' } }), ctx)

    expect(result.status).toBe(204)
    expect(cosmos.queryItems).toHaveBeenCalledWith(
      'feedback',
      'SELECT c.id FROM c WHERE c.eventId = @eventId AND c.troopId = @troopId',
      [
        { name: '@eventId', value: 'e1' },
        { name: '@troopId', value: 'troop-42' },
      ],
    )
    expect(cosmos.remove).toHaveBeenCalledWith('feedback', 'f1', 'troop-42')
    expect(cosmos.remove).toHaveBeenCalledWith('feedback', 'f2', 'troop-42')
    expect(cosmos.remove).toHaveBeenCalledWith('feedback', 'f3', 'troop-42')
    expect(cosmos.remove).toHaveBeenCalledWith('events', 'e1', 'troop-42')
  })
})
