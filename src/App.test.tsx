import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

const useAuthContextMock = vi.fn()
const useAppDataMock = vi.fn()

vi.mock('@/components/AuthProvider', () => ({
  useAuthContext: () => useAuthContextMock(),
}))

vi.mock('@/hooks/useAppData', () => ({
  useAppData: () => useAppDataMock(),
}))

beforeEach(() => {
  useAuthContextMock.mockReset()
  useAppDataMock.mockReset()
})

describe('App auth/query error states', () => {
  it('renders sign-in page when user is not authenticated', () => {
    useAuthContextMock.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      troopId: null,
      role: null,
      needsOnboarding: false,
      authError: null,
      retryMembership: vi.fn(),
      getAccessToken: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(<App />)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('renders network/query errors with actionable message', () => {
    useAuthContextMock.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { userId: 'u1', email: 'user@example.com', displayName: 'User' },
      troopId: 'troop-1',
      role: 'troopAdmin',
      needsOnboarding: false,
      authError: null,
      retryMembership: vi.fn(),
      getAccessToken: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    })

    useAppDataMock.mockReturnValue({
      events: [],
      recipes: [],
      feedback: [],
      selectedEvent: null,
      setSelectedEventId: vi.fn(),
      isLoading: false,
      queryError: new Error('Network error contacting the API'),
      failedResources: 'events, recipes, feedback',
      handleCreateEvent: vi.fn(),
      handleUpdateEvent: vi.fn(),
      handleDeleteEvent: vi.fn(),
      handleCreateRecipe: vi.fn(),
      handleUpdateRecipe: vi.fn(),
      handleDeleteRecipe: vi.fn(),
      handleAddFeedback: vi.fn(),
      handleUpdateFeedback: vi.fn(),
      handleDeleteFeedback: vi.fn(),
    })

    render(<App />)

    expect(screen.getByText('Failed to load events, recipes, feedback')).toBeInTheDocument()
    expect(screen.getByText('Network error contacting the API')).toBeInTheDocument()
  })
})
