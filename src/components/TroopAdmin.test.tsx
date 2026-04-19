import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TroopAdmin } from './TroopAdmin'

const { useAuthContextMock, membersApiMock, troopsApiMock, adminApiMock } = vi.hoisted(() => ({
  useAuthContextMock: vi.fn(() => ({
    user: { userId: 'admin-user', email: 'admin@example.com', displayName: 'Admin' },
    role: 'troopAdmin',
  })),
  membersApiMock: {
    getAll: vi.fn(),
    getMe: vi.fn(),
    create: vi.fn(),
    updateRole: vi.fn(),
    approve: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
    deleteData: vi.fn(),
  },
  troopsApiMock: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    join: vi.fn(),
  },
  adminApiMock: {
    getFlaggedContent: vi.fn(),
    reviewFlaggedContent: vi.fn(),
  },
}))

vi.mock('./AuthProvider', () => ({
  useAuthContext: useAuthContextMock,
}))

vi.mock('@/lib/api', () => ({
  membersApi: membersApiMock,
  troopsApi: troopsApiMock,
  adminApi: adminApiMock,
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
      { id: 'member-1', userId: 'member-user', displayName: 'Scout User', email: 'scout@example.com', role: 'scout', status: 'active' },
      { id: 'member-2', userId: 'member-user-2', displayName: 'Inactive User', email: 'inactive@example.com', role: 'adultLeader', status: 'deactivated' },
    ])
    membersApiMock.deleteData.mockResolvedValue(undefined)
    membersApiMock.updateStatus.mockResolvedValue(undefined)
    adminApiMock.getFlaggedContent.mockResolvedValue([])
    adminApiMock.reviewFlaggedContent.mockResolvedValue({})
  })

  it('asks for confirmation before deleting all member data', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const user = userEvent.setup()

    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Scout User')).toBeInTheDocument())
    await user.click(screen.getAllByRole('button', { name: 'Delete All Data' })[0])

    expect(confirmSpy).toHaveBeenCalled()
    expect(membersApiMock.deleteData).not.toHaveBeenCalled()
  })

  it('calls membersApi.deleteData after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const user = userEvent.setup()

    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Scout User')).toBeInTheDocument())
    await user.click(screen.getAllByRole('button', { name: 'Delete All Data' })[0])

    await waitFor(() => expect(membersApiMock.deleteData).toHaveBeenCalledWith('member-1'))
  })

  it('filters deactivated members from active roster display', async () => {
    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Scout User')).toBeInTheDocument())
    expect(screen.queryByText('Inactive User')).not.toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.queryByText('Deactivated')).not.toBeInTheDocument()
  })

  it('shows deactivate confirmation dialog and does not call API on cancel', async () => {
    const user = userEvent.setup()
    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Scout User')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Deactivate member?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(membersApiMock.updateStatus).not.toHaveBeenCalled()
  })

  it('calls membersApi.updateStatus when remove is confirmed', async () => {
    const user = userEvent.setup()
    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Scout User')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(membersApiMock.updateStatus).toHaveBeenCalledWith('troop-1', 'member-1', 'removed')
    })
  })

  it('shows flagged content and allows approving it', async () => {
    const user = userEvent.setup()
    adminApiMock.getFlaggedContent.mockResolvedValueOnce([
      {
        id: 'feedback:f1',
        contentId: 'f1',
        contentType: 'feedback',
        flagReason: 'Flagged fields: comments',
        flaggedAt: 1700000000000,
        context: { comments: 'Original comment' },
      },
    ])

    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Flagged Content Review')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Flagged fields: comments')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() =>
      expect(adminApiMock.reviewFlaggedContent).toHaveBeenCalledWith('feedback:f1', { action: 'approve', edits: undefined })
    )
  })

  it('allows editing flagged content and submitting edit action', async () => {
    const user = userEvent.setup()
    adminApiMock.getFlaggedContent.mockResolvedValueOnce([
      {
        id: 'recipe:r1',
        contentId: 'r1',
        contentType: 'recipe',
        flagReason: 'Flagged fields: name',
        flaggedAt: 1700000000000,
        context: { name: 'Bad Recipe Name' },
      },
    ])

    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Recipe: Bad Recipe Name')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    const input = await screen.findByLabelText('Edit flagged content recipe:r1')
    await user.clear(input)
    await user.type(input, 'Updated Recipe Name')
    await user.click(screen.getByRole('button', { name: 'Save Edit' }))

    await waitFor(() =>
      expect(adminApiMock.reviewFlaggedContent).toHaveBeenCalledWith('recipe:r1', {
        action: 'edit',
        edits: { name: 'Updated Recipe Name' },
      })
    )
  })
})
