import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthProvider, useAuthContext } from './AuthProvider'

const useAuthMock = vi.fn()
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => useAuthMock(),
}))

function ContextReader() {
  const auth = useAuthContext()
  return <div>{auth.authError?.message ?? 'ok'}</div>
}

describe('AuthProvider', () => {
  it('provides useAuth state to children', () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { userId: 'u1', email: 'user@example.com', displayName: 'User' },
      troopId: 'troop-1',
      role: 'troopAdmin',
      needsOnboarding: false,
      authError: { status: 401, message: 'Please sign in again' },
      retryMembership: vi.fn(),
      getAccessToken: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <AuthProvider>
        <ContextReader />
      </AuthProvider>
    )

    expect(screen.getByText('Please sign in again')).toBeInTheDocument()
  })

  it('throws if useAuthContext is used outside AuthProvider', () => {
    expect(() => render(<ContextReader />)).toThrow('useAuthContext must be used within AuthProvider')
  })
})
