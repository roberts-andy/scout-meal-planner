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

vi.mock('../middleware/moderation.js', async () => {
  const actual = await vi.importActual<any>('../middleware/moderation.js')
  return {
    ...actual,
    moderateTextFields: vi.fn(),
  }
})

import * as cosmos from '../cosmosdb.js'
import { getTroopContext } from '../middleware/auth.js'
import { moderateTextFields } from '../middleware/moderation.js'
import './feedback.js'

const feedbackHandler = registeredHandlers.feedback as (req: HttpRequest, ctx: any) => Promise<any>
const feedbackByEventHandler = registeredHandlers.feedbackByEvent as (req: HttpRequest, ctx: any) => Promise<any>
const feedbackByRecipeHandler = registeredHandlers.feedbackByRecipe as (req: HttpRequest, ctx: any) => Promise<any>

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

const validFeedbackBody = {
  eventId: 'event-1',
  mealId: 'meal-1',
  recipeId: 'recipe-1',
  rating: { taste: 5, difficulty: 3, portionSize: 4 },
  comments: 'Tasted great',
  whatWorked: 'Simple prep',
  whatToChange: 'Add more sauce',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('feedback handler moderation', () => {
  it('hides flagged feedback from non-admin users', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    vi.mocked(cosmos.getAllByTroop).mockResolvedValueOnce([
      { id: 'f-approved', moderation: { status: 'approved' } },
      { id: 'f-flagged', moderation: { status: 'flagged' } },
    ])

    const result = await feedbackHandler(makeReq({ method: 'GET' }), ctx)

    expect(result.jsonBody).toEqual([{ id: 'f-approved', moderation: { status: 'approved' } }])
  })

  it('returns flagged feedback to troop admins for review', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getAllByTroop).mockResolvedValueOnce([
      { id: 'f-approved', moderation: { status: 'approved' } },
      { id: 'f-flagged', moderation: { status: 'flagged' } },
    ])

    const result = await feedbackHandler(makeReq({ method: 'GET' }), ctx)

    expect(result.jsonBody).toHaveLength(2)
  })

  it('runs moderation on feedback comment fields during create', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(moderateTextFields).mockResolvedValueOnce({
      status: 'approved',
      flaggedFields: [],
      checkedAt: 123,
      provider: 'azure-content-safety',
    })
    vi.mocked(cosmos.create).mockImplementationOnce(async (_container, feedback) => feedback as any)

    const result = await feedbackHandler(makeReq({ method: 'POST', body: validFeedbackBody }), ctx)

    expect(result.status).toBe(201)
    expect(moderateTextFields).toHaveBeenCalledWith(
      [
        { field: 'comments', text: 'Tasted great' },
        { field: 'whatWorked', text: 'Simple prep' },
        { field: 'whatToChange', text: 'Add more sauce' },
      ],
      ctx,
    )
    expect(vi.mocked(cosmos.create).mock.calls[0][1]).toMatchObject({
      moderation: { status: 'approved' },
    })
  })

  it('filters feedbackByEvent results for non-admin users', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'f-approved', moderation: { status: 'approved' } },
      { id: 'f-pending', moderation: { status: 'pending' } },
    ])

    const result = await feedbackByEventHandler(makeReq({ method: 'GET', params: { eventId: 'event-1' } }), ctx)

    expect(result.jsonBody).toEqual([{ id: 'f-approved', moderation: { status: 'approved' } }])
  })

  it('returns recipe feedback with event context for visible entries', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    vi.mocked(cosmos.queryItems).mockResolvedValueOnce([
      { id: 'f-approved', eventId: 'event-1', moderation: { status: 'approved' } },
      { id: 'f-flagged', eventId: 'event-2', moderation: { status: 'flagged' } },
    ])
    vi.mocked(cosmos.getAllByTroop).mockResolvedValueOnce([
      { id: 'event-1', name: 'June Campout', startDate: '2026-06-10' },
      { id: 'event-2', name: 'Summer Trek', startDate: '2026-07-15' },
    ])

    const result = await feedbackByRecipeHandler(makeReq({ method: 'GET', params: { recipeId: 'recipe-1' } }), ctx)

    expect(result.jsonBody).toEqual([
      {
        id: 'f-approved',
        eventId: 'event-1',
        moderation: { status: 'approved' },
        eventName: 'June Campout',
        eventDate: '2026-06-10',
      },
    ])
  })
})
