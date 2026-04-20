import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpRequest } from '@azure/functions'

// ── Mock jose so we can control jwtVerify without network calls ──
vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => ({})),
  jwtVerify: vi.fn(),
}))

// ── Mock cosmosdb for membership lookups ──
vi.mock('../cosmosdb.js', () => ({
  queryItems: vi.fn(),
  update: vi.fn(),
}))

import { jwtVerify } from 'jose'
import { queryItems } from '../cosmosdb.js'
import { validateToken, getTroopContext, unauthorized, forbidden } from './auth.js'

function makeRequest(authHeader?: string): HttpRequest {
  return {
    headers: {
      get: (name: string) => (name.toLowerCase() === 'authorization' ? authHeader ?? null : null),
    },
  } as unknown as HttpRequest
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── validateToken ──

describe('validateToken', () => {
  it('returns null when no Authorization header', async () => {
    const result = await validateToken(makeRequest())
    expect(result).toBeNull()
  })

  it('returns null when header does not start with Bearer', async () => {
    const result = await validateToken(makeRequest('Basic abc123'))
    expect(result).toBeNull()
  })

  it('returns null when jwtVerify throws', async () => {
    vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('bad signature'))
    const result = await validateToken(makeRequest('Bearer bad-token'))
    expect(result).toBeNull()
  })

  it('extracts claims from valid token', async () => {
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: {
        sub: 'user-123',
        name: 'Test User',
        preferred_username: 'test@example.com',
      },
      protectedHeader: {} as any,
      key: {} as any,
    })
    const result = await validateToken(makeRequest('Bearer valid'))
    expect(result).toEqual({
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
    })
  })

  it('prefers emails[0] over preferred_username for email', async () => {
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: {
        sub: 'user-123',
        emails: ['primary@example.com'],
        preferred_username: 'fallback@example.com',
        name: 'Test',
      },
      protectedHeader: {} as any,
      key: {} as any,
    })
    const result = await validateToken(makeRequest('Bearer valid'))
    expect(result?.email).toBe('primary@example.com')
  })

  it('falls back to oid when sub is missing', async () => {
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: { oid: 'oid-456', name: 'X' },
      protectedHeader: {} as any,
      key: {} as any,
    })
    const result = await validateToken(makeRequest('Bearer valid'))
    expect(result?.userId).toBe('oid-456')
  })
})

// ── getTroopContext ──

describe('getTroopContext', () => {
  const ctx = { log: vi.fn(), error: vi.fn() } as any

  it('returns null when token is invalid', async () => {
    vi.mocked(jwtVerify).mockRejectedValueOnce(new Error('bad'))
    const result = await getTroopContext(makeRequest('Bearer bad'), ctx)
    expect(result).toBeNull()
  })

  it('returns null when user has no active membership', async () => {
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: { sub: 'user-1', name: 'X' },
      protectedHeader: {} as any,
      key: {} as any,
    })
    vi.mocked(queryItems).mockResolvedValueOnce([])
    const result = await getTroopContext(makeRequest('Bearer valid'), ctx)
    expect(result).toBeNull()
    expect(queryItems).toHaveBeenCalledWith(
      'members',
      'SELECT * FROM c WHERE c.userId = @userId AND c.status = "active"',
      [{ name: '@userId', value: 'user-1' }],
    )
  })

  it('returns troop context when membership exists', async () => {
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: { sub: 'user-1', name: 'Alice', preferred_username: 'alice@example.com' },
      protectedHeader: {} as any,
      key: {} as any,
    })
    vi.mocked(queryItems).mockResolvedValueOnce([
      { troopId: 'troop-42', role: 'troopAdmin' },
    ])
    const result = await getTroopContext(makeRequest('Bearer valid'), ctx)
    expect(result).toEqual({
      userId: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      troopId: 'troop-42',
      role: 'troopAdmin',
    })
  })

  it('returns null for deactivated/removed members because only active status is queried', async () => {
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: { sub: 'user-1', name: 'Alice', preferred_username: 'alice@example.com' },
      protectedHeader: {} as any,
      key: {} as any,
    })
    vi.mocked(queryItems).mockResolvedValue([])

    const result = await getTroopContext(makeRequest('Bearer valid'), ctx)

    expect(result).toBeNull()
    expect(queryItems).toHaveBeenNthCalledWith(
      1,
      'members',
      'SELECT * FROM c WHERE c.userId = @userId AND c.status = "active"',
      [{ name: '@userId', value: 'user-1' }],
    )
  })

  it('resolves troop context for a joined member once approved to active', async () => {
    vi.mocked(jwtVerify).mockResolvedValueOnce({
      payload: { sub: 'user-join', name: 'Join Scout', preferred_username: 'join@example.com' },
      protectedHeader: {} as any,
      key: {} as any,
    })
    vi.mocked(queryItems).mockResolvedValueOnce([
      {
        troopId: 'troop-join',
        role: 'scout',
        userId: 'user-join',
        email: 'join@example.com',
        status: 'active',
      },
    ])

    const result = await getTroopContext(makeRequest('Bearer valid'), ctx)

    expect(result).toEqual({
      userId: 'user-join',
      email: 'join@example.com',
      displayName: 'Join Scout',
      troopId: 'troop-join',
      role: 'scout',
    })
    expect(queryItems).toHaveBeenCalledTimes(1)
  })
})

// ── response helpers ──

describe('unauthorized', () => {
  it('returns 401 with default message', () => {
    expect(unauthorized()).toEqual({ status: 401, jsonBody: { error: 'Authentication required' } })
  })

  it('returns 401 with custom message', () => {
    expect(unauthorized('Token expired')).toEqual({ status: 401, jsonBody: { error: 'Token expired' } })
  })
})

describe('forbidden', () => {
  it('returns 403 with default message', () => {
    expect(forbidden()).toEqual({ status: 403, jsonBody: { error: 'Insufficient permissions' } })
  })

  it('returns 403 with custom message', () => {
    expect(forbidden('Not allowed')).toEqual({ status: 403, jsonBody: { error: 'Not allowed' } })
  })
})
