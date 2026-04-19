import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventFeedback } from './EventFeedback'

const baseEvent = {
  id: 'event-1',
  troopId: 'troop-1',
  name: 'Campout',
  startDate: '2026-07-01',
  endDate: '2026-07-01',
  days: [{ date: '2026-07-01', meals: [{ id: 'meal-1', type: 'dinner', scoutCount: 8, recipeId: 'recipe-1' }] }],
  createdAt: 1,
  updatedAt: 1,
} as any

const recipes = [
  {
    id: 'recipe-1',
    troopId: 'troop-1',
    name: 'Chili',
    servings: 8,
    ingredients: [],
    variations: [],
    currentVersion: 1,
    versions: [],
    createdAt: 1,
    updatedAt: 1,
  },
] as any

describe('EventFeedback date eligibility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides feedback form for future events', () => {
    vi.setSystemTime(new Date('2026-06-30T12:00:00Z'))

    render(
      <EventFeedback
        event={baseEvent}
        recipes={recipes}
        feedback={[]}
        onAddFeedback={vi.fn()}
        onUpdateFeedback={vi.fn()}
        onDeleteFeedback={vi.fn()}
      />
    )

    expect(screen.getByText('Feedback not yet available')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add feedback/i })).not.toBeInTheDocument()
  })

  it('shows feedback form when event end date has passed', () => {
    vi.setSystemTime(new Date('2026-07-02T12:00:00Z'))

    render(
      <EventFeedback
        event={baseEvent}
        recipes={recipes}
        feedback={[]}
        onAddFeedback={vi.fn()}
        onUpdateFeedback={vi.fn()}
        onDeleteFeedback={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /add feedback/i })).toBeEnabled()
  })
})
