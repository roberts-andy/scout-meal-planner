import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { EventEquipment } from './EventEquipment'

vi.mock('@/lib/api', () => ({
  eventsApi: {
    togglePackedItem: vi.fn(),
  },
}))

import { eventsApi } from '@/lib/api'

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EventEquipment', () => {
  it('toggles packed state immediately and persists through API', async () => {
    const user = userEvent.setup()
    const event = {
      id: 'event-1',
      troopId: 'troop-1',
      name: 'Camp',
      startDate: '2026-07-01',
      endDate: '2026-07-01',
      days: [{ date: '2026-07-01', meals: [{ id: 'm1', type: 'dinner', scoutCount: 8, recipeId: 'r1', selectedVariationId: 'v1' }] }],
      packedItems: [],
      createdAt: 1,
      updatedAt: 1,
    } as any

    const recipes = [{
      id: 'r1',
      name: 'Pasta',
      servings: 8,
      ingredients: [],
      variations: [{ id: 'v1', cookingMethod: 'camp-stove', instructions: [], equipment: ['Skillet'] }],
      currentVersion: 1,
      versions: [],
      troopId: 'troop-1',
      createdAt: 1,
      updatedAt: 1,
    }] as any

    vi.mocked(eventsApi.togglePackedItem).mockResolvedValueOnce({ ...event, packedItems: ['Skillet'] })

    render(<EventEquipment event={event} recipes={recipes} />, { wrapper: wrapper() })

    const checkbox = screen.getByRole('checkbox', { name: 'Skillet' })
    expect(checkbox).toHaveAttribute('aria-checked', 'false')

    await user.click(checkbox)

    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(eventsApi.togglePackedItem).toHaveBeenCalledWith('event-1', 'Skillet', true)

    await waitFor(() => {
      expect(screen.getByText('Skillet')).toHaveClass('line-through')
    })
  })
})
