import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TroopAdmin } from './TroopAdmin'

const { useAuthContextMock, membersApiMock, troopsApiMock, adminApiMock, recipesApiMock, feedbackApiMock } = vi.hoisted(() => ({
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
  recipesApiMock: {
    update: vi.fn(),
  },
  feedbackApiMock: {
    update: vi.fn(),
  },
}))

vi.mock('./AuthProvider', () => ({
  useAuthContext: useAuthContextMock,
}))

vi.mock('@/lib/api', () => ({
  membersApi: membersApiMock,
  troopsApi: troopsApiMock,
  adminApi: adminApiMock,
  recipesApi: recipesApiMock,
  feedbackApi: feedbackApiMock,
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
    ])
    membersApiMock.deleteData.mockResolvedValue(undefined)
    adminApiMock.getFlaggedContent.mockResolvedValue([])
    adminApiMock.reviewFlaggedContent.mockResolvedValue(undefined)
    recipesApiMock.update.mockResolvedValue(undefined)
    feedbackApiMock.update.mockResolvedValue(undefined)
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

  it('shows flagged content count and allows approve, edit, and remove actions', async () => {
    const user = userEvent.setup()
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('Camp Pasta Updated')
    adminApiMock.getFlaggedContent.mockResolvedValue([
      {
        id: 'recipe-1',
        contentType: 'recipe',
        submittedBy: 'Scout User',
        submittedAt: 1700000000000,
        preview: 'Camp Pasta — Step one Step two',
        content: {
          id: 'recipe-1',
          troopId: 'troop-1',
          name: 'Camp Pasta',
          servings: 8,
          ingredients: [{ id: 'ing-1', name: 'Pasta', quantity: 1, unit: 'package' }],
          variations: [{ id: 'var-1', cookingMethod: 'camp-stove', instructions: ['Step one', 'Step two'], equipment: ['pot'] }],
          currentVersion: 1,
          versions: [],
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ])

    renderTroopAdmin()

    await waitFor(() => expect(screen.getByText('Flagged Content Review (1)')).toBeInTheDocument())
    expect(screen.getAllByText('Scout User')).toHaveLength(2)
    expect(screen.getByText('Camp Pasta — Step one Step two')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(adminApiMock.reviewFlaggedContent).toHaveBeenCalledWith('recipe', 'recipe-1', 'approve'))

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await waitFor(() => expect(recipesApiMock.update).toHaveBeenCalledWith(expect.objectContaining({
      id: 'recipe-1',
      name: 'Camp Pasta Updated',
    })))

    await user.click(screen.getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(adminApiMock.reviewFlaggedContent).toHaveBeenCalledWith('recipe', 'recipe-1', 'reject'))

    promptSpy.mockRestore()
  })
})
