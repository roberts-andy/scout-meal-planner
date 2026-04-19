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
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  queryItems: vi.fn(),
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
import './feedback.js'

const recipeHandler = registeredHandlers.feedbackByRecipe as (req: HttpRequest, ctx: any) => Promise<any>

function makeReq(opts: {
  method: string
  params?: Record<string, string>
}): HttpRequest {
  return {
    method: opts.method,
    params: opts.params ?? {},
    headers: { get: () => null },
    json: () => Promise.resolve({}),
  } as unknown as HttpRequest
}

const ctx = { log: vi.fn(), error: vi.fn() } as any

const authContext = {
  userId: 'user-1',
  email: 'leader@example.com',
  displayName: 'Leader',
  troopId: 'troop-42',
  role: 'adultLeader',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('feedbackByRecipe handler', () => {
  it('returns 401 when no auth context', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(null)
    const result = await recipeHandler(makeReq({ method: 'GET', params: { recipeId: 'r-1' } }), ctx)
    expect(result.status).toBe(401)
  })

  it('returns feedback scoped by troop and recipe with event context', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(authContext)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      {
        id: 'fb-2',
        eventId: 'event-2',
        recipeId: 'r-1',
        comments: 'Great',
        rating: { taste: 5, difficulty: 4, portionSize: 4 },
        createdAt: 200,
      },
      {
        id: 'fb-1',
        eventId: 'event-1',
        recipeId: 'r-1',
        comments: 'Nice',
        rating: { taste: 4, difficulty: 3, portionSize: 4 },
        createdAt: 100,
      },
    ])
    vi.mocked(cosmos.getAllByTroop).mockResolvedValueOnce([
      { id: 'event-1', name: 'Spring Camp', startDate: '2026-04-01' },
      { id: 'event-2', name: 'Summer Camp', startDate: '2026-07-10' },
    ])

    const result = await recipeHandler(makeReq({ method: 'GET', params: { recipeId: 'r-1' } }), ctx)

    expect(cosmos.queryItems).toHaveBeenCalledWith(
      'feedback',
      'SELECT * FROM c WHERE c.recipeId = @recipeId AND c.troopId = @troopId ORDER BY c.createdAt DESC',
      [
        { name: '@recipeId', value: 'r-1' },
        { name: '@troopId', value: 'troop-42' },
      ],
    )
    expect(cosmos.getAllByTroop).toHaveBeenCalledWith('events', 'troop-42')
    expect(result.jsonBody).toEqual([
      expect.objectContaining({ id: 'fb-2', eventName: 'Summer Camp', eventDate: '2026-07-10' }),
      expect.objectContaining({ id: 'fb-1', eventName: 'Spring Camp', eventDate: '2026-04-01' }),
    ])
  })
})
