import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpRequest } from '@azure/functions'

const { registeredHandlers } = vi.hoisted(() => ({
  registeredHandlers: {} as Record<string, any>,
}))

const db = vi.hoisted(() => ({
  recipes: [] as any[],
  feedback: [] as any[],
}))

vi.mock('@azure/functions', () => ({
  app: {
    http: vi.fn((name: string, options: any) => {
      registeredHandlers[name] = options.handler
    }),
  },
}))

vi.mock('../cosmosdb.js', () => ({
  getAllByTroop: vi.fn(async (container: 'recipes' | 'feedback', troopId: string) =>
    db[container].filter((item) => item.troopId === troopId),
  ),
  getById: vi.fn(async (container: 'recipes' | 'feedback', id: string, troopId: string) =>
    db[container].find((item) => item.id === id && item.troopId === troopId),
  ),
  create: vi.fn(async (container: 'recipes' | 'feedback', doc: any) => {
    db[container].push(doc)
    return doc
  }),
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

import { getTroopContext } from '../middleware/auth.js'
import './recipes.js'
import './adminFlaggedContent.js'

const recipesHandler = registeredHandlers.recipes as (req: HttpRequest, ctx: any) => Promise<any>
const adminFlaggedContentHandler = registeredHandlers.adminFlaggedContent as (req: HttpRequest, ctx: any) => Promise<any>

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

const ctx = { log: vi.fn(), error: vi.fn(), warn: vi.fn() } as any

const adminAuth = {
  userId: 'admin-1',
  email: 'admin@example.com',
  displayName: 'Admin',
  troopId: 'troop-42',
  role: 'troopAdmin',
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

describe('moderation failure path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    db.recipes.length = 0
    db.feedback.length = 0
    process.env.CONTENT_SAFETY_ENDPOINT = 'https://content-safety.example'
    process.env.CONTENT_SAFETY_KEY = 'test-key'
  })

  it('stores recipe with pending moderation and surfaces it in admin flagged content', async () => {
    vi.mocked(getTroopContext).mockResolvedValue(adminAuth)
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Content Safety outage'))

    const createResult = await recipesHandler(makeReq({ method: 'POST', body: validRecipeBody }), ctx)

    expect(createResult.status).toBe(201)
    expect(createResult.jsonBody).toEqual(expect.objectContaining({
      moderation: expect.objectContaining({ status: 'pending' }),
    }))

    const listResult = await adminFlaggedContentHandler(makeReq({ method: 'GET' }), ctx)

    expect(listResult.jsonBody).toEqual(expect.arrayContaining([
      expect.objectContaining({
        contentType: 'recipe',
        contentId: createResult.jsonBody.id,
        moderation: expect.objectContaining({ status: 'pending' }),
      }),
    ]))
  })
})
