import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EventDetail } from './EventDetail'
import { Event } from '@/lib/types'

vi.mock('./EventSchedule', () => ({ EventSchedule: () => <div>Schedule</div> }))
vi.mock('./EventShoppingList', () => ({ EventShoppingList: () => <div>Shopping</div> }))
vi.mock('./EventEquipment', () => ({ EventEquipment: () => <div>Equipment</div> }))
vi.mock('./EventFeedback', () => ({ EventFeedback: () => <div>Feedback</div> }))
vi.mock('./EditEventDialog', () => ({ EditEventDialog: () => null }))

function makeEvent(endDate: string): Event {
  return {
    id: 'event-1',
    troopId: 'troop-1',
    name: 'Campout',
    startDate: '2026-07-01',
    endDate,
    days: [{ date: '2026-07-01', meals: [] }],
    createdAt: 1,
    updatedAt: 1,
  }
}

const props = {
  recipes: [],
  feedback: [],
  onUpdateEvent: vi.fn(),
  onBack: vi.fn(),
  onAddFeedback: vi.fn(),
  onUpdateFeedback: vi.fn(),
  onDeleteFeedback: vi.fn(),
  onUpdateRecipe: vi.fn(),
}

describe('EventDetail feedback tab gate', () => {
  it('disables feedback tab for future events', () => {
    render(<EventDetail event={makeEvent('2099-12-31')} {...props} />)
    expect(screen.getByRole('tab', { name: /feedback/i })).toBeDisabled()
  })

  it('enables feedback tab for past events', () => {
    render(<EventDetail event={makeEvent('2000-01-01')} {...props} />)
    expect(screen.getByRole('tab', { name: /feedback/i })).toBeEnabled()
  })
})
