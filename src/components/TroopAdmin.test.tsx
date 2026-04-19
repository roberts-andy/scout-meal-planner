import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TroopAdmin } from './TroopAdmin'

const getAllMembers = vi.fn()
const getTroop = vi.fn()

vi.mock('@/components/AuthProvider', () => ({
  useAuthContext: () => ({
    user: { userId: 'admin-user' },
    role: 'troopAdmin',
  }),
}))

vi.mock('@/lib/api', () => ({
  membersApi: {
    getAll: () => getAllMembers(),
    updateRole: vi.fn(),
    approve: vi.fn(),
    remove: vi.fn(),
    create: vi.fn(),
  },
  troopsApi: {
    get: () => getTroop(),
  },
}))

describe('TroopAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getTroop.mockResolvedValue({
      id: 'troop-1',
      name: 'Troop 42',
      inviteCode: 'INVITE42',
      createdBy: 'admin-user',
      createdAt: 1,
      updatedAt: 1,
    })
    getAllMembers.mockResolvedValue([
      { id: 'm-pending', troopId: 'troop-1', userId: '', email: 'pending@example.com', displayName: 'Pending Member', role: 'scout', status: 'pending', joinedAt: 1 },
      { id: 'm-active', troopId: 'troop-1', userId: 'active-user', email: 'active@example.com', displayName: 'Active Member', role: 'scout', status: 'active', joinedAt: 1 },
      { id: 'm-deactivated', troopId: 'troop-1', userId: 'deactivated-user', email: 'deactivated@example.com', displayName: 'Deactivated Member', role: 'scout', status: 'deactivated', joinedAt: 1 },
      { id: 'm-removed', troopId: 'troop-1', userId: 'removed-user', email: 'removed@example.com', displayName: 'Removed Member', role: 'scout', status: 'removed', joinedAt: 1 },
    ])
  })

  it('shows current member statuses in role assignment tables', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={client}>
        <TroopAdmin />
      </QueryClientProvider>
    )

    expect(await screen.findByText('Members (3)')).toBeInTheDocument()
    expect(screen.getByText('Pending Approvals (1)')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Deactivated')).toBeInTheDocument()
    expect(screen.getByText('Removed')).toBeInTheDocument()
  })
})
