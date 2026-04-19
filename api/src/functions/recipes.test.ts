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
import './recipes.js'

const handler = registeredHandlers.recipes as (req: HttpRequest, ctx: any) => Promise<any>

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

const validRecipeBody = {
  name: 'Camp Pasta',
  servings: 8,
  ingredients: [{ id: 'ing-1', name: 'Pasta', quantity: 2, unit: 'package' }],
  variations: [
    {
      id: 'var-1',
      cookingMethod: 'camp-stove',
      instructions: ['Boil water', 'Cook pasta'],
      equipment: ['pot'],
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('recipes handler moderation', () => {
  it('hides flagged and pending recipes from non-admin users', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    vi.mocked(cosmos.getAllByTroop).mockResolvedValueOnce([
      { id: 'approved', moderation: { status: 'approved' } },
      { id: 'flagged', moderation: { status: 'flagged' } },
      { id: 'pending', moderation: { status: 'pending' } },
      { id: 'legacy-no-status' },
    ])

    const result = await handler(makeReq({ method: 'GET' }), ctx)

    expect(result.jsonBody).toEqual([
      { id: 'approved', moderation: { status: 'approved' } },
      { id: 'legacy-no-status' },
    ])
  })

  it('returns flagged recipes to troop admins for review', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getAllByTroop).mockResolvedValueOnce([
      { id: 'approved', moderation: { status: 'approved' } },
      { id: 'flagged', moderation: { status: 'flagged' } },
    ])

    const result = await handler(makeReq({ method: 'GET' }), ctx)

    expect(result.jsonBody).toHaveLength(2)
  })

  it('runs moderation on recipe name and variation instructions during create', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(moderateTextFields).mockResolvedValueOnce({
      status: 'approved',
      flaggedFields: [],
      checkedAt: 123,
      provider: 'azure-content-safety',
    })
    vi.mocked(cosmos.create).mockImplementationOnce(async (_container, recipe) => recipe as any)

    const result = await handler(makeReq({ method: 'POST', body: validRecipeBody }), ctx)

    expect(result.status).toBe(201)
    expect(moderateTextFields).toHaveBeenCalledWith(
      [
        { field: 'name', text: 'Camp Pasta' },
        { field: 'variations[0].instructions[0]', text: 'Boil water' },
        { field: 'variations[0].instructions[1]', text: 'Cook pasta' },
      ],
      ctx,
    )
    const created = vi.mocked(cosmos.create).mock.calls[0][1] as any
    expect(created.moderation.status).toBe('approved')
  })

  it('re-runs moderation during update and persists status', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(adminAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce({ id: 'r1', troopId: 'troop-42' } as any)
    vi.mocked(moderateTextFields).mockResolvedValueOnce({
      status: 'flagged',
      flaggedFields: ['name'],
      checkedAt: 456,
      provider: 'azure-content-safety',
    })
    vi.mocked(cosmos.update).mockImplementationOnce(async (_c, _id, recipe) => recipe as any)

    const result = await handler(makeReq({ method: 'PUT', params: { id: 'r1' }, body: validRecipeBody }), ctx)

    expect(result.jsonBody.moderation.status).toBe('flagged')
    expect(vi.mocked(cosmos.update).mock.calls[0][2]).toMatchObject({
      moderation: { status: 'flagged', flaggedFields: ['name'] },
    })
  })
})
