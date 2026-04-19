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
  queryItems: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
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
import './members.js'

const handler = registeredHandlers.members as (req: HttpRequest, ctx: any) => Promise<any>
const deleteDataHandler = registeredHandlers.memberDataDeletion as (req: HttpRequest, ctx: any) => Promise<any>

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('members handler — POST', () => {
  it('returns 401 when no auth context', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(null)
    const result = await handler(makeReq({ method: 'POST', body: { displayName: 'New Member', email: 'new@example.com', role: 'scout' } }), ctx)
    expect(result.status).toBe(401)
  })

  it('returns 403 when caller lacks manageMembers permission', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    const result = await handler(makeReq({ method: 'POST', body: { displayName: 'New Member', email: 'new@example.com', role: 'scout' } }), ctx)
    expect(result.status).toBe(403)
    expect(cosmos.create).not.toHaveBeenCalled()
  })

  it('returns 400 when required fields are missing', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    const result = await handler(makeReq({ method: 'POST', body: { role: 'scout' } }), ctx)
    expect(result.status).toBe(400)
    expect(cosmos.create).not.toHaveBeenCalled()
  })

  it('returns 409 when a member with the same email already exists in troop', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([{ id: 'existing-member' }])

    const result = await handler(makeReq({ method: 'POST', body: { displayName: 'New Member', email: 'new@example.com', role: 'scout' } }), ctx)

    expect(result.status).toBe(409)
    expect(cosmos.create).not.toHaveBeenCalled()
  })

  it('creates and returns an active member document', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([])
    vi.mocked(cosmos.create).mockImplementationOnce(async (_container, member) => member as any)

    const result = await handler(makeReq({
      method: 'POST',
      body: { displayName: 'New Member', email: 'new@example.com', role: 'scout', id: 'malicious-id', troopId: 'other-troop' },
    }), ctx)

    expect(result.status).toBe(201)
    expect(cosmos.queryItems).toHaveBeenCalledWith(
      'members',
      'SELECT * FROM c WHERE c.troopId = @troopId AND c.email = @email',
      [
        { name: '@troopId', value: 'troop-42' },
        { name: '@email', value: 'new@example.com' },
      ],
    )
    const created = vi.mocked(cosmos.create).mock.calls[0][1] as any
    expect(created.id).toMatch(/^[0-9a-f-]+$/)
    expect(created.id).not.toBe('malicious-id')
    expect(created.troopId).toBe('troop-42')
    expect(created.status).toBe('active')
    expect(created.joinedAt).toEqual(expect.any(Number))
    expect(created.displayName).toBe('New Member')
    expect(created.email).toBe('new@example.com')
    expect(created.role).toBe('scout')
  })
})

describe('memberDataDeletion handler — DELETE /members/{id}/data', () => {
  it('returns 401 when caller is unauthenticated', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(null)

    const result = await deleteDataHandler(makeReq({ method: 'DELETE', params: { id: 'member-1' } }), ctx)

    expect(result.status).toBe(401)
  })

  it('returns 403 when caller lacks manageTroop permission', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)

    const result = await deleteDataHandler(makeReq({ method: 'DELETE', params: { id: 'member-1' } }), ctx)

    expect(result.status).toBe(403)
    expect(cosmos.remove).not.toHaveBeenCalled()
  })

  it('returns 404 when target member does not exist in troop', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([])

    const result = await deleteDataHandler(makeReq({ method: 'DELETE', params: { id: 'member-1' } }), ctx)

    expect(result.status).toBe(404)
    expect(cosmos.remove).not.toHaveBeenCalled()
  })

  it('anonymizes feedback and event audit fields, then removes member document', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems)
      .mockResolvedValueOnce([{ id: 'member-1', troopId: 'troop-42', userId: 'user-2' }])
      .mockResolvedValueOnce([{
        id: 'feedback-1',
        troopId: 'troop-42',
        memberId: 'member-1',
        scoutName: 'Scout',
        createdBy: { userId: 'user-2', displayName: 'Scout' },
        updatedBy: { userId: 'user-2', displayName: 'Scout' },
      }])
      .mockResolvedValueOnce([{
        id: 'event-1',
        troopId: 'troop-42',
        createdBy: { userId: 'user-2', displayName: 'Scout' },
        updatedBy: { userId: 'user-2', displayName: 'Scout' },
        updatedAt: 1,
      }])

    const result = await deleteDataHandler(makeReq({ method: 'DELETE', params: { id: 'member-1' } }), ctx)

    expect(result.status).toBe(204)
    expect(cosmos.queryItems).toHaveBeenCalledTimes(3)
    expect(cosmos.queryItems).toHaveBeenNthCalledWith(
      2,
      'feedback',
      expect.stringContaining('c.memberId = @memberId'),
      expect.arrayContaining([
        { name: '@troopId', value: 'troop-42' },
        { name: '@memberId', value: 'member-1' },
        { name: '@userId', value: 'user-2' },
      ]),
    )

    const feedbackUpdate = vi.mocked(cosmos.update).mock.calls.find(([container]) => container === 'feedback')
    const eventUpdate = vi.mocked(cosmos.update).mock.calls.find(([container]) => container === 'events')
    expect(feedbackUpdate).toBeDefined()
    expect(eventUpdate).toBeDefined()
    expect((feedbackUpdate?.[2] as any).memberId).toBeUndefined()
    expect(feedbackUpdate?.[2]).toMatchObject({
      createdBy: { userId: 'deleted-member', displayName: 'Deleted Member' },
      scoutName: 'Deleted Member',
      updatedBy: { userId: 'user-1', displayName: 'Admin' },
    })
    expect(eventUpdate?.[2]).toMatchObject({
      createdBy: { userId: 'deleted-member', displayName: 'Deleted Member' },
      updatedBy: { userId: 'user-1', displayName: 'Admin' },
    })
    expect(cosmos.remove).toHaveBeenCalledWith('members', 'member-1', 'troop-42')
  })
})
