import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { InteractionRequiredAuthError } from '@azure/msal-browser'

const useMsalMock = vi.fn()
vi.mock('@azure/msal-react', () => ({
  useMsal: () => useMsalMock(),
}))

import { useAuth } from './useAuth'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  useMsalMock.mockReset()
  mockFetch.mockReset()
})

function createInteractionRequiredError() {
  return new InteractionRequiredAuthError('interaction_required', 'interaction required')
}

describe('useAuth auth-failure handling', () => {
  it('marks session as requiring sign-in when interaction prompt is cancelled', async () => {
    const instance = {
      acquireTokenSilent: vi.fn().mockRejectedValue(createInteractionRequiredError()),
      acquireTokenPopup: vi.fn().mockRejectedValue({ errorCode: 'user_cancelled' }),
      loginRedirect: vi.fn(),
      logoutRedirect: vi.fn(),
    }

    useMsalMock.mockReturnValue({
      instance,
      accounts: [{ localAccountId: 'u1', username: 'user@example.com', name: 'User' }],
      inProgress: 'none',
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.authError).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('recovers from InteractionRequiredAuthError when popup succeeds', async () => {
    const instance = {
      acquireTokenSilent: vi.fn().mockRejectedValue(createInteractionRequiredError()),
      acquireTokenPopup: vi.fn().mockResolvedValue({ idToken: 'token-123' }),
      loginRedirect: vi.fn(),
      logoutRedirect: vi.fn(),
    }

    useMsalMock.mockReturnValue({
      instance,
      accounts: [{ localAccountId: 'u1', username: 'user@example.com', name: 'User' }],
      inProgress: 'none',
    })

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ troopId: 'troop-1', role: 'troopAdmin' }),
    })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.troopId).toBe('troop-1')
    expect(result.current.authError).toBeNull()
    expect(instance.acquireTokenPopup).toHaveBeenCalledTimes(1)
  })
})
