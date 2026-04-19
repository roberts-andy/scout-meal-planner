import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EventShoppingList } from './EventShoppingList'
import { eventsApi } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  eventsApi: {
    togglePurchasedItem: vi.fn(),
  },
}))

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

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

    render(<EventShoppingList event={event} recipes={recipes} />, { wrapper: wrapper() })

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

  it('toggles purchased state immediately and persists through API', async () => {
    const user = userEvent.setup()
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
      purchasedItems: [],
      createdAt: 1,
      updatedAt: 1,
    } as any

    const recipes = [{
      id: 'recipe-1',
      troopId: 'troop-1',
      name: 'Chili',
      servings: 4,
      ingredients: [{ id: 'i1', name: 'Beans', quantity: 2, unit: 'can', estimatedPrice: 4 }],
      variations: [],
      createdAt: 1,
      updatedAt: 1,
      currentVersion: 1,
      versions: [],
    }] as any

    vi.mocked(eventsApi.togglePurchasedItem).mockResolvedValueOnce({
      ...event,
      purchasedItems: ['beans-can'],
    })

    render(<EventShoppingList event={event} recipes={recipes} />, { wrapper: wrapper() })

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
    expect(screen.getByText('0 of 1 items checked')).toBeInTheDocument()

    await user.click(checkbox)

    expect(screen.getByText('1 of 1 items checked')).toBeInTheDocument()
    expect(checkbox).toBeChecked()

    await waitFor(() => {
      expect(eventsApi.togglePurchasedItem).toHaveBeenCalledWith('event-1', 'beans-can', true)
    })
  })
})
