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
  queryItems: vi.fn(),
  remove: vi.fn(),
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

const listHandler = registeredHandlers.adminFlaggedContent as (req: HttpRequest, ctx: any) => Promise<any>
const actionHandler = registeredHandlers.adminFlaggedContentAction as (req: HttpRequest, ctx: any) => Promise<any>

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

describe('admin flagged content list handler', () => {
  it('returns 401 when caller is unauthenticated', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(null)
    const result = await listHandler(makeReq({ method: 'GET' }), ctx)
    expect(result.status).toBe(401)
  })

  it('returns 403 when caller lacks manageTroop permission', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    const result = await listHandler(makeReq({ method: 'GET' }), ctx)
    expect(result.status).toBe(403)
  })

  it('returns combined flagged recipes and feedback for caller troop', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.queryItems)
      .mockResolvedValueOnce([{ id: 'recipe-1', name: 'Flagged Recipe', createdAt: 10, createdBy: { displayName: 'Chef' }, moderation: { status: 'flagged' } }])
      .mockResolvedValueOnce([{ id: 'feedback-1', comments: 'Too salty', createdAt: 20, scoutName: 'Scout A', moderation: { status: 'flagged' } }])

    const result = await listHandler(makeReq({ method: 'GET' }), ctx)

    expect(cosmos.queryItems).toHaveBeenCalledTimes(2)
    expect(result.jsonBody).toHaveLength(2)
    expect(result.jsonBody[0]).toMatchObject({
      id: 'feedback-1',
      contentType: 'feedback',
      preview: 'Too salty',
    })
    expect(result.jsonBody[1]).toMatchObject({
      id: 'recipe-1',
      contentType: 'recipe',
      context: { name: 'Flagged Recipe' },
    })
  })
})

describe('admin flagged content action handler', () => {
  it('approves flagged content', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'recipe-1',
      troopId: 'troop-42',
      name: 'Flagged Recipe',
      servings: 4,
      ingredients: [],
      variations: [],
      moderation: { status: 'flagged' },
    })
    vi.mocked(cosmos.update).mockImplementationOnce(async (_container, _id, item) => item as any)

    const result = await actionHandler(makeReq({
      method: 'PUT',
      params: { contentType: 'recipe', id: 'recipe-1' },
      body: { action: 'approve' },
    }), ctx)

    expect(result.jsonBody.moderation.status).toBe('approved')
    expect(cosmos.update).toHaveBeenCalledWith(
      'recipes',
      'recipe-1',
      expect.objectContaining({
        id: 'recipe-1',
        troopId: 'troop-42',
        moderation: expect.objectContaining({ status: 'approved' }),
      }),
      'troop-42',
    )
  })

  it('edits and approves flagged feedback', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'feedback-1',
      troopId: 'troop-42',
      eventId: 'event-1',
      mealId: 'meal-1',
      recipeId: 'recipe-1',
      rating: { taste: 3, difficulty: 3, portionSize: 3 },
      comments: 'old comment',
      whatWorked: 'old worked',
      whatToChange: 'old change',
      moderation: { status: 'flagged' },
    })
    vi.mocked(cosmos.update).mockImplementationOnce(async (_container, _id, item) => item as any)

    const result = await actionHandler(makeReq({
      method: 'PUT',
      params: { contentType: 'feedback', id: 'feedback-1' },
      body: { action: 'edit', updates: { comments: 'updated comment' } },
    }), ctx)

    expect(result.jsonBody.preview).toBe('updated comment')
    expect(cosmos.update).toHaveBeenCalledWith(
      'feedback',
      'feedback-1',
      expect.objectContaining({
        comments: 'updated comment',
        moderation: expect.objectContaining({ status: 'approved' }),
      }),
      'troop-42',
    )
  })

  it('rejects and removes flagged content', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({
      id: 'feedback-1',
      troopId: 'troop-42',
      moderation: { status: 'flagged' },
    })

    const result = await actionHandler(makeReq({
      method: 'PUT',
      params: { contentType: 'feedback', id: 'feedback-1' },
      body: { action: 'reject' },
    }), ctx)

    expect(result.status).toBe(204)
    expect(cosmos.remove).toHaveBeenCalledWith('feedback', 'feedback-1', 'troop-42')
  })
})
