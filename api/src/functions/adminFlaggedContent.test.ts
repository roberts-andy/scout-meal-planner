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
  getAllByTroop: vi.fn(),
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
import './adminFlaggedContent.js'

const handler = registeredHandlers.adminFlaggedContent as (req: HttpRequest, ctx: any) => Promise<any>

function makeReq(opts: {
  method: string
  params?: Record<string, string>
  body?: any
}): HttpRequest {
  return {
    method: opts.method,
    params: opts.params || {},
    headers: { get: () => null },
    json: () => Promise.resolve(opts.body),
  } as unknown as HttpRequest
}

const ctx = { log: vi.fn(), error: vi.fn() } as any

const adminAuth = {
  userId: 'admin-1',
  email: 'admin@example.com',
  displayName: 'Admin',
  troopId: 'troop-42',
  role: 'troopAdmin',
}

const scoutAuth = {
  userId: 'scout-1',
  email: 'scout@example.com',
  displayName: 'Scout',
  troopId: 'troop-42',
  role: 'scout',
}

describe('admin flagged content handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(null)
    const result = await handler(makeReq({ method: 'GET' }), ctx)
    expect(result.status).toBe(401)
  })

  it('returns 403 for non-admin users', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    const result = await handler(makeReq({ method: 'GET' }), ctx)
    expect(result.status).toBe(403)
  })

  it('returns flagged recipes and feedback with context', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getAllByTroop)
      .mockResolvedValueOnce([
        { id: 'recipe-1', troopId: 'troop-42', name: 'Chili', moderation: { status: 'flagged', flaggedFields: ['name'], checkedAt: 1000 } },
        { id: 'recipe-2', troopId: 'troop-42', name: 'Pasta', moderation: { status: 'approved', checkedAt: 999 } },
      ])
      .mockResolvedValueOnce([
        { id: 'feedback-1', troopId: 'troop-42', comments: 'Bad words', moderation: { status: 'flagged', flaggedFields: ['comments'], checkedAt: 2000 } },
      ])

    const result = await handler(makeReq({ method: 'GET' }), ctx)

    expect(result.jsonBody).toEqual([
      expect.objectContaining({
        id: 'feedback:feedback-1',
        contentType: 'feedback',
        flagReason: 'Flagged fields: comments',
        flaggedAt: 2000,
      }),
      expect.objectContaining({
        id: 'recipe:recipe-1',
        contentType: 'recipe',
        flagReason: 'Flagged fields: name',
        flaggedAt: 1000,
      }),
    ])
  })

  it('approves flagged content review action', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'feedback-1',
      troopId: 'troop-42',
      comments: 'Needs review',
      moderation: { status: 'flagged', flaggedFields: ['comments'] },
    })
    vi.mocked(cosmos.update).mockImplementationOnce(async (_container, _id, doc) => doc as any)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'feedback:feedback-1' },
      body: { action: 'approve' },
    }), ctx)

    expect(result.jsonBody).toEqual(expect.objectContaining({
      id: 'feedback:feedback-1',
      action: 'approve',
    }))
    expect(cosmos.update).toHaveBeenCalledWith(
      'feedback',
      'feedback-1',
      expect.objectContaining({
        moderation: expect.objectContaining({
          status: 'approved',
          flaggedFields: [],
          reviewAction: 'approve',
        }),
      }),
      'troop-42'
    )
  })

  it('rejects flagged content review action', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'recipe-1',
      troopId: 'troop-42',
      name: 'Bad name',
      moderation: { status: 'flagged', flaggedFields: ['name'] },
    })
    vi.mocked(cosmos.update).mockImplementationOnce(async (_container, _id, doc) => doc as any)

    await handler(makeReq({
      method: 'PUT',
      params: { id: 'recipe:recipe-1' },
      body: { action: 'reject' },
    }), ctx)

    expect(cosmos.update).toHaveBeenCalledWith(
      'recipes',
      'recipe-1',
      expect.objectContaining({
        moderation: expect.objectContaining({
          status: 'flagged',
          reviewAction: 'reject',
        }),
      }),
      'troop-42'
    )
  })

  it('edits flagged content and marks approved', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'feedback-1',
      troopId: 'troop-42',
      comments: 'Original',
      whatWorked: 'Original worked',
      whatToChange: 'Original change',
      moderation: { status: 'flagged', flaggedFields: ['comments'] },
    })
    vi.mocked(cosmos.update).mockImplementationOnce(async (_container, _id, doc) => doc as any)

    await handler(makeReq({
      method: 'PUT',
      params: { id: 'feedback:feedback-1' },
      body: { action: 'edit', edits: { comments: 'Updated comment' } },
    }), ctx)

    expect(cosmos.update).toHaveBeenCalledWith(
      'feedback',
      'feedback-1',
      expect.objectContaining({
        comments: 'Updated comment',
        moderation: expect.objectContaining({
          status: 'approved',
          reviewAction: 'edit',
        }),
      }),
      'troop-42'
    )
  })

  it('returns 400 for edit action without any editable values', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)

    const result = await handler(makeReq({
      method: 'PUT',
      params: { id: 'feedback:feedback-1' },
      body: { action: 'edit', edits: {} },
    }), ctx)

    expect(result.status).toBe(400)
    expect(cosmos.update).not.toHaveBeenCalled()
  })
})
