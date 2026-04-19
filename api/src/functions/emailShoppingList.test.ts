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

vi.mock('../cosmosdb.js', () => ({
  getById: vi.fn(),
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
import './emailShoppingList.js'

const handler = registeredHandlers['emailShoppingList'] as (req: HttpRequest, ctx: any) => Promise<any>
const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function makeReq(body: any, id = 'event-1'): HttpRequest {
  return {
    method: 'POST',
    params: { id },
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as HttpRequest
}

const ctx = { log: vi.fn(), error: vi.fn() } as any
const scoutAuth = {
  userId: 'user-2',
  email: 'scout@example.com',
  displayName: 'Scout',
  troopId: 'troop-42',
  role: 'scout',
}

const originalEnv = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SENDGRID_API_KEY = 'test-key'
  process.env.SENDGRID_FROM_EMAIL = 'from@example.com'
  vi.mocked(cosmos.getById).mockResolvedValue({ id: 'event-1', troopId: 'troop-42', name: 'Campout' } as any)
})

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('email shopping list handler', () => {
  it('returns 401 when no auth context', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(null)
    const result = await handler(makeReq({}), ctx)
    expect(result.status).toBe(401)
  })

  it('returns 400 for invalid body', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    const result = await handler(makeReq({ recipientEmail: 'bad' }), ctx)
    expect(result.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 404 when event is not found', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce(undefined)
    const result = await handler(makeReq({
      recipientEmail: 'parent@example.com',
      eventName: 'Campout',
      items: [{ name: 'Beans', quantity: 2, unit: 'can' }],
    }), ctx)
    expect(result.status).toBe(404)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 500 when email service env vars are missing', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    delete process.env.SENDGRID_API_KEY
    const result = await handler(makeReq({
      recipientEmail: 'parent@example.com',
      eventName: 'Campout',
      items: [{ name: 'Beans', quantity: 2, unit: 'can' }],
    }), ctx)
    expect(result.status).toBe(500)
    expect(result.jsonBody.error).toBe('Email service not configured')
  })

  it('sends a formatted shopping list email', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    fetchMock.mockResolvedValueOnce({ ok: true, status: 202 })

    const result = await handler(makeReq({
      recipientEmail: 'parent@example.com',
      eventName: 'Campout',
      items: [
        { name: 'Beans', quantity: 2, unit: 'can' },
        { name: 'Salt', quantity: 1.5, unit: 'tsp' },
      ],
    }), ctx)

    expect(result.status).toBe(202)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.sendgrid.com/v3/mail/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
        }),
      })
    )

    const payload = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(payload.personalizations[0].to[0].email).toBe('parent@example.com')
    expect(payload.subject).toBe('Shopping List: Campout')
    expect(payload.content[0].value).toContain('Beans: 2 can')
    expect(payload.content[0].value).toContain('Salt: 1.5 tsp')
  })

  it('returns 502 when SendGrid returns an error', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    fetchMock.mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('bad request') })

    const result = await handler(makeReq({
      recipientEmail: 'parent@example.com',
      eventName: 'Campout',
      items: [{ name: 'Beans', quantity: 2, unit: 'can' }],
    }), ctx)

    expect(result.status).toBe(502)
    expect(result.jsonBody.error).toBe('Failed to send email')
  })
})
