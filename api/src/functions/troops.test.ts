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
  getAll: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  queryItems: vi.fn(),
}))

vi.mock('../middleware/auth.js', async () => {
  const actual = await vi.importActual<any>('../middleware/auth.js')
  return {
    ...actual,
    validateToken: vi.fn(),
    getTroopContext: vi.fn(),
  }
})

import * as cosmos from '../cosmosdb.js'
import { validateToken } from '../middleware/auth.js'
import './troops.js'

const joinHandler = registeredHandlers.joinTroop as (req: HttpRequest, ctx: any) => Promise<any>

function makeReq(opts: {
  method: string
  body?: any
}): HttpRequest {
  return {
    method: opts.method,
    params: {},
    headers: { get: () => null },
    json: () => Promise.resolve(opts.body),
  } as unknown as HttpRequest
}

const ctx = { log: vi.fn(), error: vi.fn() } as any

beforeEach(() => {
  vi.clearAllMocks()
})

describe('joinTroop handler', () => {
  it('returns 401 when token is invalid', async () => {
    vi.mocked(validateToken).mockResolvedValueOnce(null)

    const result = await joinHandler(makeReq({ method: 'POST', body: { inviteCode: 'TROOP-ABCD' } }), ctx)
    expect(result.status).toBe(401)
  })

  it('creates scout member with first-name displayName and authenticated identity fields', async () => {
    vi.mocked(validateToken).mockResolvedValueOnce({
      userId: 'scout-1',
      email: 'scout@example.com',
      displayName: 'Scout Person',
    })
    vi.mocked(cosmos.queryItems)
      .mockResolvedValueOnce([{ id: 'troop-1', inviteCode: 'TROOP-ABCD' }])
      .mockResolvedValueOnce([])
    vi.mocked(cosmos.create).mockImplementationOnce(async (_container, item) => item as any)

    const result = await joinHandler(makeReq({ method: 'POST', body: { inviteCode: 'TROOP-ABCD' } }), ctx)

    expect(result.status).toBe(201)
    const created = vi.mocked(cosmos.create).mock.calls[0][1] as any
    expect(created.id).toMatch(/^[0-9a-f-]+$/)
    expect(created.troopId).toBe('troop-1')
    expect(created.userId).toBe('scout-1')
    expect(created.email).toBe('scout@example.com')
    expect(created.joinedAt).toEqual(expect.any(Number))
    expect(created.displayName).toBe('Scout')
    expect(created.role).toBe('scout')
    expect(created.status).toBe('pending')
    expect(Object.keys(created).sort()).toEqual(['displayName', 'email', 'id', 'joinedAt', 'role', 'status', 'troopId', 'userId'])
  })
})
