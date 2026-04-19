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
  getById: vi.fn(),
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
import './adminFlaggedContent.js'

const handler = registeredHandlers.adminFlaggedContent as (req: HttpRequest, ctx: any) => Promise<any>

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

const nonAdminAuth = {
  userId: 'user-2',
  email: 'adult@example.com',
  displayName: 'Adult',
  troopId: 'troop-42',
  role: 'adultLeader',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('admin flagged content handler', () => {
  it('requires manageTroop permission', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(nonAdminAuth)

    const result = await handler(makeReq({ method: 'GET' }), ctx)

    expect(result.status).toBe(403)
  })

  it('lists flagged recipes and feedback with context', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems)
      .mockResolvedValueOnce([
        {
          id: 'recipe-1',
          name: 'Camp Pasta',
          createdAt: 100,
          createdBy: { userId: 'u-1', displayName: 'Scout A' },
          moderation: { status: 'flagged' },
          variations: [{ instructions: ['Step one', 'Step two'] }],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'feedback-1',
          comments: 'Inappropriate content',
          whatWorked: 'Quick cook',
          whatToChange: 'Language',
          createdAt: 200,
          createdBy: { userId: 'u-2', displayName: 'Scout B' },
          moderation: { status: 'flagged' },
        },
      ])

    const result = await handler(makeReq({ method: 'GET' }), ctx)

    expect(result.jsonBody).toHaveLength(2)
    expect(result.jsonBody[0]).toMatchObject({
      contentType: 'feedback',
      id: 'feedback-1',
      submittedBy: 'Scout B',
      submittedAt: 200,
    })
    expect(result.jsonBody[1]).toMatchObject({
      contentType: 'recipe',
      id: 'recipe-1',
      submittedBy: 'Scout A',
      submittedAt: 100,
    })
    expect(result.jsonBody[1].preview).toContain('Camp Pasta')
  })

  it('approves flagged content', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'recipe-1',
      troopId: 'troop-42',
      moderation: { status: 'flagged' },
    } as any)
    vi.mocked(cosmos.update).mockImplementationOnce(async (_container, _id, item) => item as any)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { contentType: 'recipe', id: 'recipe-1' },
      body: { action: 'approve' },
    }), ctx)

    expect(result.jsonBody).toEqual({ id: 'recipe-1', contentType: 'recipe', status: 'approved' })
    expect(vi.mocked(cosmos.update).mock.calls[0][0]).toBe('recipes')
    expect(vi.mocked(cosmos.update).mock.calls[0][2]).toMatchObject({
      moderation: { status: 'approved' },
      updatedBy: { userId: 'user-1' },
    })
  })

  it('rejects flagged content by removing it', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'feedback-1',
      troopId: 'troop-42',
      moderation: { status: 'flagged' },
    } as any)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { contentType: 'feedback', id: 'feedback-1' },
      body: { action: 'reject' },
    }), ctx)

    expect(result.status).toBe(204)
    expect(cosmos.remove).toHaveBeenCalledWith('feedback', 'feedback-1', 'troop-42')
  })
})
