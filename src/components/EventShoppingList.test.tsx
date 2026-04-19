import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventShoppingList } from './EventShoppingList'

describe('EventShoppingList estimated prices', () => {
  it('shows a price column and total estimated cost with optional item prices', () => {
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

    render(<EventShoppingList event={event} recipes={recipes} />)

    expect(screen.getAllByText('Price').length).toBeGreaterThan(0)
    expect(screen.getAllByText('$4.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Total Estimated Cost')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
