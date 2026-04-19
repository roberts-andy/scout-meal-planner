import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TroopAdmin } from './TroopAdmin'

const { useAuthContextMock, membersApiMock, troopsApiMock } = vi.hoisted(() => ({
  useAuthContextMock: vi.fn(() => ({
    user: { userId: 'admin-user', email: 'admin@example.com', displayName: 'Admin' },
    role: 'troopAdmin',
  })),
  membersApiMock: {
    getAll: vi.fn(),
    getMe: vi.fn(),
    create: vi.fn(),
    updateRole: vi.fn(),
    updateStatus: vi.fn(),
    approve: vi.fn(),
    remove: vi.fn(),
    deleteData: vi.fn(),
  },
  troopsApiMock: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    join: vi.fn(),
  },
}))

vi.mock('./AuthProvider', () => ({
  useAuthContext: useAuthContextMock,
}))

vi.mock('@/lib/api', () => ({
  membersApi: membersApiMock,
  troopsApi: troopsApiMock,
}))

function renderTroopAdmin() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <TroopAdmin />
    </QueryClientProvider>
  )
}

describe('TroopAdmin member data deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    troopsApiMock.get.mockResolvedValue({ id: 'troop-1', name: 'Troop 1', inviteCode: 'INVITE' })
    membersApiMock.getAll.mockResolvedValue([
      { id: 'member-1', troopId: 'troop-1', userId: 'member-user', displayName: 'Scout User', email: 'scout@example.com', role: 'scout', status: 'active' },
    ])
    membersApiMock.deleteData.mockResolvedValue(undefined)
    membersApiMock.updateStatus.mockResolvedValue(undefined)
  })

  it('asks for confirmation before deleting all member data', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()

    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Scout User')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Delete All Data' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(membersApiMock.deleteData).not.toHaveBeenCalled()
  })

  it('calls membersApi.deleteData after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()

    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Scout User')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Delete All Data' }))

    await waitFor(() => expect(membersApiMock.deleteData).toHaveBeenCalledWith('member-1'))
  })

  it('deactivates a member only after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()

    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Scout User')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(membersApiMock.updateStatus).not.toHaveBeenCalled()

    confirmSpy.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    await waitFor(() => expect(membersApiMock.updateStatus).toHaveBeenCalledWith('troop-1', 'member-1', 'deactivated'))
  })

  it('removes a member only after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()

    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Scout User')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(confirmSpy).toHaveBeenCalled()
    expect(membersApiMock.updateStatus).not.toHaveBeenCalled()

    confirmSpy.mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(membersApiMock.updateStatus).toHaveBeenCalledWith('troop-1', 'member-1', 'removed'))
  })
})
