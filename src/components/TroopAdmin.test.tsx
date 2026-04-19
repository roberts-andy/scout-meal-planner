import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TroopAdmin } from './TroopAdmin'

const { mockTroopsApi, mockMembersApi } = vi.hoisted(() => ({
  mockTroopsApi: {
    get: vi.fn(),
  },
  mockMembersApi: {
    getAll: vi.fn(),
    updateRole: vi.fn(),
    approve: vi.fn(),
    updateStatus: vi.fn(),
    create: vi.fn(),
  },
}))

vi.mock('@/lib/api', () => ({
  troopsApi: mockTroopsApi,
  membersApi: mockMembersApi,
}))

vi.mock('./AuthProvider', () => ({
  useAuthContext: () => ({
    user: { userId: 'admin-user' },
    role: 'troopAdmin',
  }),
}))

function renderTroopAdmin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <TroopAdmin />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTroopsApi.get.mockResolvedValue({
    id: 'troop-1',
    name: 'Troop 1',
    inviteCode: 'TROOP-1234',
  })
  mockMembersApi.getAll.mockResolvedValue([
    {
      id: 'member-1',
      troopId: 'troop-1',
      userId: 'scout-user',
      email: 'scout@example.com',
      displayName: 'Scout Member',
      role: 'scout',
      status: 'active',
      joinedAt: Date.now(),
    },
  ])
  mockMembersApi.updateRole.mockResolvedValue({})
  mockMembersApi.approve.mockResolvedValue({})
  mockMembersApi.updateStatus.mockResolvedValue({})
  mockMembersApi.create.mockResolvedValue({})
})

describe('TroopAdmin member status actions', () => {
  it('shows a confirmation dialog before deactivating and then updates status', async () => {
    const user = userEvent.setup()
    renderTroopAdmin()

    await user.click(await screen.findByRole('button', { name: 'Deactivate' }))
    expect(screen.getByRole('heading', { name: 'Deactivate member?' })).toBeInTheDocument()
    expect(screen.getByText(/will lose access immediately, but their troop data will be retained/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm Deactivate' }))
    expect(mockMembersApi.updateStatus).toHaveBeenCalledWith('troop-1', 'member-1', 'deactivated')
  })

  it('shows a confirmation dialog before removing and then updates status', async () => {
    const user = userEvent.setup()
    renderTroopAdmin()

    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    expect(screen.getByRole('heading', { name: 'Remove member?' })).toBeInTheDocument()
    expect(screen.getByText(/will be removed from the troop roster and lose access immediately/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm Remove' }))
    expect(mockMembersApi.updateStatus).toHaveBeenCalledWith('troop-1', 'member-1', 'removed')
  })
})
