import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventFeedback } from './EventFeedback'
import { Event, Recipe } from '@/lib/types'

function makeEvent(endDate: string): Event {
  return {
    id: 'event-1',
    troopId: 'troop-1',
    name: 'Campout',
    startDate: '2026-07-01',
    endDate,
    days: [
      {
        date: '2026-07-01',
        meals: [{ id: 'meal-1', type: 'dinner', scoutCount: 8, recipeId: 'recipe-1' }]
      }
    ],
    createdAt: 1,
    updatedAt: 1,
  }
}

const recipes: Recipe[] = [{
  id: 'recipe-1',
  troopId: 'troop-1',
  name: 'Chili',
  servings: 8,
  ingredients: [],
  variations: [],
  createdAt: 1,
  updatedAt: 1,
  currentVersion: 1,
  versions: [],
}]

describe('EventFeedback date gate', () => {
  it('shows unavailable message for future events', () => {
    render(
      <EventFeedback
        event={makeEvent('2099-12-31')}
        recipes={recipes}
        feedback={[]}
        onAddFeedback={vi.fn()}
        onUpdateFeedback={vi.fn()}
        onDeleteFeedback={vi.fn()}
      />
    )

    expect(screen.getByText(/feedback not available yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add feedback/i })).not.toBeInTheDocument()
  })

  it('shows add feedback actions after event has ended', () => {
    render(
      <EventFeedback
        event={makeEvent('2000-01-01')}
        recipes={recipes}
        feedback={[]}
        onAddFeedback={vi.fn()}
        onUpdateFeedback={vi.fn()}
        onDeleteFeedback={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /add feedback/i })).toBeInTheDocument()
  })
})
