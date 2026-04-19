import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventShoppingList } from './EventShoppingList'
import { shoppingListApi } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  shoppingListApi: {
    email: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const event = {
  id: 'event-1',
  troopId: 'troop-1',
  name: 'Summer Camp',
  startDate: '2026-07-01',
  endDate: '2026-07-03',
  days: [
    {
      date: '2026-07-01',
      meals: [{ id: 'meal-1', type: 'breakfast', recipeId: 'recipe-1', scoutCount: 4 }],
    },
  ],
  createdAt: 1,
  updatedAt: 1,
} as any

const recipes = [
  {
    id: 'recipe-1',
    troopId: 'troop-1',
    name: 'Pancakes',
    servings: 4,
    ingredients: [{ id: 'ing-1', name: 'Flour', quantity: 2, unit: 'cup' }],
    variations: [],
    currentVersion: 1,
    versions: [],
    createdAt: 1,
    updatedAt: 1,
  },
] as any

describe('EventShoppingList email flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends formatted shopping list items to recipient email', async () => {
    vi.mocked(shoppingListApi.email).mockResolvedValueOnce({ status: 'queued' })
    const user = userEvent.setup()

    render(<EventShoppingList event={event} recipes={recipes} />)

    await user.click(screen.getByRole('button', { name: /email list/i }))
    await user.type(screen.getByLabelText(/recipient email/i), 'parent@example.com')
    await user.click(screen.getByRole('button', { name: /send email/i }))

    expect(shoppingListApi.email).toHaveBeenCalledWith({
      recipientEmail: 'parent@example.com',
      eventName: 'Summer Camp',
      items: [{ name: 'Flour', quantity: 2, unit: 'cup' }],
    })
  })
})

