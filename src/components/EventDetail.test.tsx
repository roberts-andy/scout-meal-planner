import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EventDetail } from './EventDetail'
import { eventsApi } from '@/lib/api'
import { __setFeatureFlagsForTests } from '@/lib/featureFlags'

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
  departureTime: '08:00',
  returnTime: '14:30',
  headcount: {
    scoutCount: 12,
    adultCount: 4,
    guestCount: 2,
  },
  days: [{ date: '2026-07-01', meals: [] }],
  createdAt: 1,
  updatedAt: 1,
} as any

describe('EventDetail feedback tab date gate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    __setFeatureFlagsForTests({
      'enable-feedback': true,
      'enable-shared-links': true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    })
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

  it('disables feedback tab when feedback feature flag is off', () => {
    __setFeatureFlagsForTests({ 'enable-feedback': false })
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

    expect(screen.getByRole('tab', { name: 'Feedback' })).toBeDisabled()
  })

  it('shows departure/return times, headcount, and trip logistics badges including weather', () => {
    vi.setSystemTime(new Date('2026-07-02T12:00:00Z'))

    render(
      <EventDetail
        event={{
          ...baseEvent,
          powerAvailable: true,
          runningWater: true,
          trailerAccess: true,
          expectedWeather: 'Cold nights',
        }}
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

    expect(screen.getByText('Departure: 08:00')).toBeInTheDocument()
    expect(screen.getByText('Return: 14:30')).toBeInTheDocument()
    expect(screen.getByText('Headcount: 12 scouts, 4 adults, 2 guests')).toBeInTheDocument()
    expect(screen.getByText('Power Available')).toBeInTheDocument()
    expect(screen.getByText('Running Water')).toBeInTheDocument()
    expect(screen.getByText('Trailer Access')).toBeInTheDocument()
    expect(screen.getByText('Weather: Cold nights')).toBeInTheDocument()
  })

  it('shows Not set for missing departure/return/headcount', () => {
    vi.setSystemTime(new Date('2026-07-02T12:00:00Z'))

    render(
      <EventDetail
        event={{ ...baseEvent, departureTime: undefined, returnTime: undefined, headcount: undefined }}
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

    expect(screen.getByText('Departure: Not set')).toBeInTheDocument()
    expect(screen.getByText('Return: Not set')).toBeInTheDocument()
    expect(screen.getByText('Headcount: Not set')).toBeInTheDocument()
  })

  it('displays generated share link inline and copies via visible Copy button', async () => {
    vi.useRealTimers()
    const shareUrl = 'https://example.test/share/abc123'
    vi.mocked(eventsApi.getShare).mockResolvedValue({ shareToken: 'abc123', shareUrl })
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

    expect(await screen.findByText('Share Link:')).toBeInTheDocument()
    expect(screen.getByText(shareUrl)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(shareUrl)
    })
  })
})
