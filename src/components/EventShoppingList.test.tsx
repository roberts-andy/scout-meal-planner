import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventShoppingList } from './EventShoppingList'

const { eventsApiMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  eventsApiMock: {
    emailShoppingList: vi.fn(),
  },
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  eventsApi: eventsApiMock,
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EventShoppingList estimated prices', () => {
  const event = {
    id: 'event-1',
    troopId: 'troop-1',
    name: 'Campout',
    startDate: '2026-07-01',
    endDate: '2026-07-01',
    days: [{
      date: '2026-07-01',
      meals: [{ id: 'meal-1', type: 'dinner', scoutCount: 4, recipeId: 'recipe-1' }],
    }],
    createdAt: 1,
    updatedAt: 1,
  } as any

  const recipes = [{
    id: 'recipe-1',
    troopId: 'troop-1',
    name: 'Chili',
    servings: 4,
    ingredients: [
      { id: 'i1', name: 'Beans', quantity: 2, unit: 'can', estimatedPrice: 4 },
      { id: 'i2', name: 'Salt', quantity: 1, unit: 'tsp' },
    ],
    variations: [],
    createdAt: 1,
    updatedAt: 1,
    currentVersion: 1,
    versions: [],
  }] as any

  it('shows a price column and total estimated cost with optional item prices', () => {
    render(<EventShoppingList event={event} recipes={recipes} />)

    expect(screen.getAllByText('Price')[0]).toBeInTheDocument()
    expect(screen.getByText('Total Estimated Cost')).toBeInTheDocument()

    const beansRow = screen.getByText('Beans').closest('div.grid')
    expect(beansRow).not.toBeNull()
    expect(within(beansRow as HTMLElement).getByText('$4.00')).toBeInTheDocument()

    const saltRow = screen.getByText('Salt').closest('div.grid')
    expect(saltRow).not.toBeNull()
    expect(within(saltRow as HTMLElement).getByText('—')).toBeInTheDocument()

    const totalRow = screen.getByText('Total Estimated Cost').closest('div.flex')
    expect(totalRow).not.toBeNull()
    expect(within(totalRow as HTMLElement).getByText('$4.00')).toBeInTheDocument()
  })

  it('sends shopping list email to specified recipient', async () => {
    const user = userEvent.setup()
    eventsApiMock.emailShoppingList.mockResolvedValueOnce({ message: 'sent' })

    render(<EventShoppingList event={event} recipes={recipes} />)

    await user.click(screen.getByRole('button', { name: 'Email List' }))
    await user.type(screen.getByLabelText('Recipient email'), 'parent@example.com')
    await user.click(screen.getByRole('button', { name: 'Send Email' }))

    await waitFor(() => {
      expect(eventsApiMock.emailShoppingList).toHaveBeenCalledWith(
        'event-1',
        expect.objectContaining({
          recipientEmail: 'parent@example.com',
          items: expect.arrayContaining([
            expect.objectContaining({ name: 'Beans', quantity: 2, unit: 'can' }),
            expect.objectContaining({ name: 'Salt', quantity: 1, unit: 'tsp' }),
          ]),
        })
      )
    })

    expect(toastSuccessMock).toHaveBeenCalledWith('Shopping list emailed')
    await waitFor(() => expect(screen.queryByText('Email shopping list')).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Email List' }))
    expect(screen.getByLabelText('Recipient email')).toHaveValue('')
  })

  it('shows validation error when sending without recipient email', async () => {
    const user = userEvent.setup()

    render(<EventShoppingList event={event} recipes={recipes} />)

    await user.click(screen.getByRole('button', { name: 'Email List' }))
    await user.click(screen.getByRole('button', { name: 'Send Email' }))

    expect(eventsApiMock.emailShoppingList).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith('Recipient email is required')
  })

  it('shows error toast when API request fails', async () => {
    const user = userEvent.setup()
    eventsApiMock.emailShoppingList.mockRejectedValueOnce(new Error('Network down'))

    render(<EventShoppingList event={event} recipes={recipes} />)

    await user.click(screen.getByRole('button', { name: 'Email List' }))
    await user.type(screen.getByLabelText('Recipient email'), 'parent@example.com')
    await user.click(screen.getByRole('button', { name: 'Send Email' }))

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Failed to email shopping list', {
        description: 'Network down',
      })
    })
  })
})
