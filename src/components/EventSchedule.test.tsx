import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventSchedule } from './EventSchedule'

describe('EventSchedule meal flags', () => {
  const baseEvent = {
    id: 'event-1',
    troopId: 'troop-1',
    name: 'Summer Camp',
    startDate: '2026-07-01',
    endDate: '2026-07-01',
    days: [{ date: '2026-07-01', meals: [] }],
    createdAt: 1,
    updatedAt: 1,
  } as any

  it('allows trailside and time-constrained to be selected independently when adding a meal', async () => {
    const onUpdateEvent = vi.fn()
    const user = userEvent.setup()

    render(
      <EventSchedule
        event={baseEvent}
        recipes={[]}
        onUpdateEvent={onUpdateEvent}
        onUpdateRecipe={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /add meal/i }))

    const trailside = screen.getByRole('checkbox', { name: /trailside/i })
    const timeConstrained = screen.getByRole('checkbox', { name: /time-constrained/i })

    expect(trailside).toHaveAttribute('aria-checked', 'false')
    expect(timeConstrained).toHaveAttribute('aria-checked', 'false')

    await user.click(trailside)
    expect(trailside).toHaveAttribute('aria-checked', 'true')
    expect(timeConstrained).toHaveAttribute('aria-checked', 'false')

    await user.click(timeConstrained)
    expect(trailside).toHaveAttribute('aria-checked', 'true')
    expect(timeConstrained).toHaveAttribute('aria-checked', 'true')
    await user.type(screen.getByLabelText(/dietary notes \(optional\)/i), 'Nut allergy - avoid peanuts')

    expect(
      screen.getByText('Dietary notes for recipe selection: Nut allergy - avoid peanuts')
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^add meal$/i }))

    expect(onUpdateEvent).toHaveBeenCalledTimes(1)
    const updatedEvent = onUpdateEvent.mock.calls[0][0]
    expect(updatedEvent.days[0].meals[0]).toMatchObject({
      isTrailside: true,
      isTimeConstrained: true,
      dietaryNotes: 'Nut allergy - avoid peanuts',
    })
  })

  it('shows meal parameter badges and dietary notes in schedule view', () => {
    const eventWithFlags = {
      ...baseEvent,
      days: [{
        date: '2026-07-01',
        meals: [{
          id: 'meal-1',
          type: 'lunch',
          scoutCount: 8,
          isTrailside: true,
          isTimeConstrained: true,
          dietaryNotes: 'Vegetarian option needed',
        }],
      }],
    }

    render(
      <EventSchedule
        event={eventWithFlags}
        recipes={[]}
        onUpdateEvent={vi.fn()}
        onUpdateRecipe={vi.fn()}
      />
    )

    expect(screen.getByText('Trailside')).toBeInTheDocument()
    expect(screen.getByText('Time-Constrained')).toBeInTheDocument()
    expect(screen.getByText('Dietary Notes')).toBeInTheDocument()
    expect(screen.getByText('Vegetarian option needed')).toBeInTheDocument()
  })
})
