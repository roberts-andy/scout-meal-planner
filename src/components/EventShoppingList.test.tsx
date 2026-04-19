import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventShoppingList } from './EventShoppingList'

const recipe = {
  id: 'recipe-1',
  troopId: 'troop-1',
  name: 'Pancakes',
  servings: 4,
  ingredients: [{ id: 'ing-1', name: 'Flour', quantity: 2, unit: 'cup' }],
  variations: [],
  createdAt: 1,
  updatedAt: 1,
  currentVersion: 1,
  versions: [],
} as any

const event = {
  id: 'event-1',
  troopId: 'troop-1',
  name: 'Campout',
  startDate: '2026-07-01',
  endDate: '2026-07-01',
  days: [{ date: '2026-07-01', meals: [{ id: 'meal-1', type: 'breakfast', recipeId: 'recipe-1', scoutCount: 4 }] }],
  createdAt: 1,
  updatedAt: 1,
} as any

describe('EventShoppingList', () => {
  it('reads checked state from event.purchasedItems and persists toggles via onUpdateEvent', async () => {
    const user = userEvent.setup()
    const onUpdateEvent = vi.fn()

    render(
      <EventShoppingList
        event={{ ...event, purchasedItems: ['flour-cup'] }}
        recipes={[recipe]}
        onUpdateEvent={onUpdateEvent}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('1 of 1 items checked')).toBeInTheDocument()

    await user.click(checkbox)

    expect(screen.getByText('0 of 1 items checked')).toBeInTheDocument()
    expect(onUpdateEvent).toHaveBeenCalledWith({
      ...event,
      purchasedItems: [],
    })
  })
})
