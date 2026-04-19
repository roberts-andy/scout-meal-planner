import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

vi.mock('../middleware/auth.js', async () => {
  const actual = await vi.importActual<any>('../middleware/auth.js')
  return {
    ...actual,
    getTroopContext: vi.fn(),
  }
})

import { getTroopContext } from '../middleware/auth.js'
import './emailShoppingList.js'

const handler = registeredHandlers['emailShoppingList'] as (req: HttpRequest, ctx: any) => Promise<any>
const ctx = { log: vi.fn(), error: vi.fn() } as any

const auth = {
  userId: 'user-1',
  email: 'leader@example.com',
  displayName: 'Leader',
  troopId: 'troop-1',
  role: 'adultLeader',
}

const validBody = {
  recipientEmail: 'parent@example.com',
  eventName: 'Campout',
  items: [
    { name: 'Flour', quantity: 2, unit: 'cup' },
    { name: 'Salt', quantity: 1, unit: 'to-taste' },
  ],
}

function makeReq(body: any): HttpRequest {
  return {
    method: 'POST',
    params: {},
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as HttpRequest
}

const originalEnv = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env = { ...originalEnv }
})

afterEach(() => {
  process.env = { ...originalEnv }
  vi.unstubAllGlobals()
})

describe('emailShoppingList handler', () => {
  it('returns 401 when no auth context', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(null)
    const result = await handler(makeReq(validBody), ctx)
    expect(result.status).toBe(401)
  })

  it('returns 400 for invalid request body', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(auth)
    const result = await handler(makeReq({ recipientEmail: 'bad', eventName: '', items: [] }), ctx)
    expect(result.status).toBe(400)
  })

  it('returns 500 when email provider is not configured', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(auth)
    delete process.env.SENDGRID_API_KEY
    delete process.env.SENDGRID_FROM_EMAIL

    const result = await handler(makeReq(validBody), ctx)

    expect(result.status).toBe(500)
    expect(result.jsonBody.error).toContain('not configured')
  })

  it('sends shopping list with item names, quantities, and units', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(auth)
    process.env.SENDGRID_API_KEY = 'sg-test-key'
    process.env.SENDGRID_FROM_EMAIL = 'noreply@scoutmealplanner.test'

    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 202 })
    vi.stubGlobal('fetch', mockFetch)

    const result = await handler(makeReq(validBody), ctx)

    expect(result.status).toBe(202)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.sendgrid.com/v3/mail/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sg-test-key',
        }),
      })
    )

    const payload = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(payload.personalizations[0].to[0].email).toBe('parent@example.com')
    expect(payload.subject).toBe('Shopping List: Campout')
    expect(payload.content[0].value).toContain('Flour: 2 cup')
    expect(payload.content[0].value).toContain('Salt: 1 to taste')
  })
})

