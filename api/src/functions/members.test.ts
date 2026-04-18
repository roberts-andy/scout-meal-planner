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

const leaderAuth = {
  userId: 'user-3',
  email: 'leader@example.com',
  displayName: 'Leader',
  troopId: 'troop-42',
  role: 'adultLeader',
}

describe('members handler — PUT (role changes)', () => {
  it('returns 403 when non-admin tries to change roles', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(leaderAuth)
    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'member-1' },
      body: { role: 'scout' },
    }), ctx)
    expect(result.status).toBe(403)
  })

  it('returns 404 when member not found', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([])
    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'nonexistent' },
      body: { role: 'scout' },
    }), ctx)
    expect(result.status).toBe(404)
  })

  it('allows admin to change a member role', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'member-1', troopId: 'troop-42', role: 'scout', status: 'active' },
    ])
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'member-1' },
      body: { role: 'patrolLeader' },
    }), ctx)

    expect(result.jsonBody.role).toBe('patrolLeader')
  })

  it('blocks demoting the last active troopAdmin', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'admin-1', troopId: 'troop-42', role: 'troopAdmin', status: 'active' },
    ])
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([{ id: 'admin-1' }])

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'admin-1' },
      body: { role: 'adultLeader' },
    }), ctx)

    expect(result.status).toBe(400)
    expect(result.jsonBody.error).toContain('last active troop admin')
    expect(cosmos.update).not.toHaveBeenCalled()
  })

  it('allows demoting an admin when other active admins exist', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'admin-1', troopId: 'troop-42', role: 'troopAdmin', status: 'active' },
    ])
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([{ id: 'admin-1' }, { id: 'admin-2' }])
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'admin-1' },
      body: { role: 'adultLeader' },
    }), ctx)

    expect(result.jsonBody.role).toBe('adultLeader')
  })
})

describe('members handler — PUT (deactivate / remove)', () => {
  it('deactivates a member and records audit trail', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'member-1', troopId: 'troop-42', role: 'scout', status: 'active' },
    ])
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'member-1' },
      body: { status: 'deactivated', reason: 'Left the troop' },
    }), ctx)

    expect(result.jsonBody.status).toBe('deactivated')
    expect(result.jsonBody.statusChangedAt).toEqual(expect.any(Number))
    expect(result.jsonBody.statusChangedBy).toBe('user-1')
    expect(result.jsonBody.statusChangeReason).toBe('Left the troop')
    expect(result.jsonBody.previousStatus).toBe('active')
  })

  it('sets member status to removed with audit trail', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'member-1', troopId: 'troop-42', role: 'scout', status: 'active' },
    ])
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'member-1' },
      body: { status: 'removed', reason: 'Expelled from troop' },
    }), ctx)

    expect(result.jsonBody.status).toBe('removed')
    expect(result.jsonBody.statusChangedBy).toBe('user-1')
    expect(result.jsonBody.previousStatus).toBe('active')
  })

  it('blocks deactivating the last active troopAdmin', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'admin-1', troopId: 'troop-42', role: 'troopAdmin', status: 'active' },
    ])
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([{ id: 'admin-1' }])

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'admin-1' },
      body: { status: 'deactivated' },
    }), ctx)

    expect(result.status).toBe(400)
    expect(result.jsonBody.error).toContain('last active troop admin')
    expect(cosmos.update).not.toHaveBeenCalled()
  })

  it('blocks removing the last active troopAdmin', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'admin-1', troopId: 'troop-42', role: 'troopAdmin', status: 'active' },
    ])
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([{ id: 'admin-1' }])

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'admin-1' },
      body: { status: 'removed' },
    }), ctx)

    expect(result.status).toBe(400)
    expect(cosmos.update).not.toHaveBeenCalled()
  })

  it('allows deactivating an admin when other active admins exist', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'admin-1', troopId: 'troop-42', role: 'troopAdmin', status: 'active' },
    ])
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([{ id: 'admin-1' }, { id: 'admin-2' }])
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'admin-1' },
      body: { status: 'deactivated' },
    }), ctx)

    expect(result.jsonBody.status).toBe('deactivated')
  })

  it('returns 403 when non-admin tries to deactivate', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(leaderAuth)
    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'member-1' },
      body: { status: 'deactivated' },
    }), ctx)
    expect(result.status).toBe(403)
    expect(cosmos.update).not.toHaveBeenCalled()
  })

  it('reactivates a deactivated member', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'member-1', troopId: 'troop-42', role: 'scout', status: 'deactivated' },
    ])
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'member-1' },
      body: { status: 'active' },
    }), ctx)

    expect(result.jsonBody.status).toBe('active')
    expect(result.jsonBody.previousStatus).toBe('deactivated')
  })

  it('rejects invalid status value', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'member-1' },
      body: { status: 'banned' },
    }), ctx)
    expect(result.status).toBe(400)
  })

  it('does not set audit fields when only role changes', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'member-1', troopId: 'troop-42', role: 'scout', status: 'active' },
    ])
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, item) => item as any)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'member-1' },
      body: { role: 'patrolLeader' },
    }), ctx)

    expect(result.jsonBody.role).toBe('patrolLeader')
    expect(result.jsonBody.statusChangedAt).toBeUndefined()
    expect(result.jsonBody.statusChangedBy).toBeUndefined()
  })
})
