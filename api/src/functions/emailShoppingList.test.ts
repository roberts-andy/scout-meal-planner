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

vi.mock('@azure/communication-email', () => ({
  EmailClient: vi.fn(),
}))

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn(),
}))

import * as cosmos from '../cosmosdb.js'
import { getTroopContext } from '../middleware/auth.js'
import { _setEmailClient } from './emailShoppingList.js'

const handler = registeredHandlers['emailShoppingList'] as (req: HttpRequest, ctx: any) => Promise<any>

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

const mockPollUntilDone = vi.fn()
const mockBeginSend = vi.fn()
const mockEmailClient = { beginSend: mockBeginSend } as any

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ACS_ENDPOINT = 'acs-scout-meal-planner.unitedstates.communication.azure.com'
  process.env.ACS_FROM_EMAIL = 'DoNotReply@acs-scout-meal-planner.azurecomm.net'
  _setEmailClient(mockEmailClient)
  mockBeginSend.mockResolvedValue({ pollUntilDone: mockPollUntilDone })
  mockPollUntilDone.mockResolvedValue({ status: 'Succeeded' })
  vi.mocked(cosmos.getById).mockResolvedValue({ id: 'event-1', troopId: 'troop-42', name: 'Campout' } as any)
})

afterEach(() => {
  process.env = { ...originalEnv }
  _setEmailClient(undefined)
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
    expect(mockBeginSend).not.toHaveBeenCalled()
  })

  it('returns 404 when event is not found', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    vi.mocked(cosmos.getById).mockResolvedValueOnce(undefined)
    const result = await handler(makeReq({
      recipientEmail: 'parent@example.com',
      items: [{ name: 'Beans', quantity: 2, unit: 'can' }],
    }), ctx)
    expect(result.status).toBe(404)
    expect(mockBeginSend).not.toHaveBeenCalled()
  })

  it('returns 500 when email service env vars are missing', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    delete process.env.ACS_FROM_EMAIL
    const result = await handler(makeReq({
      recipientEmail: 'parent@example.com',
      items: [{ name: 'Beans', quantity: 2, unit: 'can' }],
    }), ctx)
    expect(result.status).toBe(500)
    expect(result.jsonBody.error).toBe('Email service not configured')
  })

  it('sends a formatted shopping list email via ACS', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)

    const result = await handler(makeReq({
      recipientEmail: 'parent@example.com',
      items: [
        { name: 'Beans', quantity: 2, unit: 'can' },
        { name: 'Salt', quantity: 1.5, unit: 'tsp' },
      ],
    }), ctx)

    expect(result.status).toBe(202)
    expect(mockBeginSend).toHaveBeenCalledOnce()

    const message = mockBeginSend.mock.calls[0][0]
    expect(message.senderAddress).toBe('DoNotReply@acs-scout-meal-planner.azurecomm.net')
    expect(message.recipients.to[0].address).toBe('parent@example.com')
    expect(message.content.subject).toBe('Shopping List: Campout')
    expect(message.content.plainText).toContain('Beans: 2 can')
    expect(message.content.plainText).toContain('Salt: 1.5 tsp')
  })

  it('returns 502 when ACS returns an error status', async () => {
    vi.mocked(getTroopContext).mockResolvedValueOnce(scoutAuth)
    mockPollUntilDone.mockResolvedValueOnce({ status: 'Failed', error: { message: 'bad request' } })

    const result = await handler(makeReq({
      recipientEmail: 'parent@example.com',
      items: [{ name: 'Beans', quantity: 2, unit: 'can' }],
    }), ctx)

    expect(result.status).toBe(502)
    expect(result.jsonBody.error).toBe('Failed to send email')
  })
})
