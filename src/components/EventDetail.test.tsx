import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventDetail } from './EventDetail'

vi.mock('@/lib/api', () => ({
  eventsApi: {
    getShare: vi.fn().mockResolvedValue({ shareUrl: null }),
    regenerateShare: vi.fn(),
    revokeShare: vi.fn(),
  },
}))

vi.mock('./EventSchedule', () => ({ EventSchedule: () => <div>Event Schedule</div> }))
vi.mock('./EventShoppingList', () => ({ EventShoppingList: () => <div>Event Shopping List</div> }))
vi.mock('./EventEquipment', () => ({ EventEquipment: () => <div>Event Equipment</div> }))
vi.mock('./EventFeedback', () => ({ EventFeedback: () => <div>Event Feedback</div> }))
vi.mock('./EditEventDialog', () => ({ EditEventDialog: () => null }))

const baseEvent = {
  id: 'event-1',
  troopId: 'troop-1',
  name: 'Campout',
  startDate: '2026-07-01',
  endDate: '2026-07-01',
  days: [{ date: '2026-07-01', meals: [] }],
  createdAt: 1,
  updatedAt: 1,
} as any

describe('EventDetail feedback tab date gate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('disables feedback tab for future events', () => {
    vi.setSystemTime(new Date('2026-06-30T12:00:00Z'))

    render(
      <EventDetail
        event={baseEvent}
        recipes={[]}
        feedback={[]}
        onUpdateEvent={vi.fn()}
        onBack={vi.fn()}
        onAddFeedback={vi.fn()}
        onUpdateFeedback={vi.fn()}
        onDeleteFeedback={vi.fn()}
        onUpdateRecipe={vi.fn()}
      />
    )

    expect(screen.getByRole('tab', { name: 'Feedback' })).toBeDisabled()
  })

  it('enables feedback tab when event end date has passed', () => {
    vi.setSystemTime(new Date('2026-07-02T12:00:00Z'))

    render(
      <EventDetail
        event={baseEvent}
        recipes={[]}
        feedback={[]}
        onUpdateEvent={vi.fn()}
        onBack={vi.fn()}
        onAddFeedback={vi.fn()}
        onUpdateFeedback={vi.fn()}
        onDeleteFeedback={vi.fn()}
        onUpdateRecipe={vi.fn()}
      />
    )

    expect(screen.getByRole('tab', { name: 'Feedback' })).toBeEnabled()
  })
})
