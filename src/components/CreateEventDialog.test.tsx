import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateEventDialog } from './CreateEventDialog'

const { useAuthContextMock } = vi.hoisted(() => ({
  useAuthContextMock: vi.fn(() => ({ troopId: 'troop-1' })),
}))

vi.mock('./AuthProvider', () => ({
  useAuthContext: useAuthContextMock,
}))

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: { onSelect?: (value: unknown) => void }) => (
    <div data-testid="mock-range-calendar">
      <button
        type="button"
        onClick={() => onSelect?.({ from: new Date(2026, 0, 5), to: new Date(2026, 0, 7) })}
      >
        Pick date range
      </button>
    </div>
  ),
}))

describe('CreateEventDialog date picker', () => {
  it('keeps the calendar hidden until a date field is clicked', async () => {
    const user = userEvent.setup()
    render(<CreateEventDialog open onOpenChange={vi.fn()} onCreateEvent={vi.fn()} />)

    expect(screen.queryByTestId('mock-range-calendar')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Start Date'))

    expect(screen.getByTestId('mock-range-calendar')).toBeInTheDocument()
  })

  it('opens from either date field, fills both fields, and closes after selecting both dates', async () => {
    const user = userEvent.setup()
    render(<CreateEventDialog open onOpenChange={vi.fn()} onCreateEvent={vi.fn()} />)

    await user.click(screen.getByLabelText('End Date'))
    expect(screen.getByTestId('mock-range-calendar')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pick date range' }))

    await waitFor(() => {
      expect(screen.queryByTestId('mock-range-calendar')).not.toBeInTheDocument()
    })

    expect(screen.getByLabelText('Start Date')).toHaveValue('Jan 5, 2026')
    expect(screen.getByLabelText('End Date')).toHaveValue('Jan 7, 2026')
  })
})
