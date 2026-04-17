import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StarRating } from './StarRating'

describe('StarRating', () => {
  it('renders the specified number of stars', () => {
    render(<StarRating value={3} maxStars={5} />)
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('defaults to 5 stars', () => {
    render(<StarRating value={0} />)
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('calls onChange with clicked value when not readonly', async () => {
    const onChange = vi.fn()
    render(<StarRating value={0} onChange={onChange} />)
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button')[2])
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('disables buttons when readonly', () => {
    render(<StarRating value={4} readonly />)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })

  it('does not call onChange when readonly', async () => {
    const onChange = vi.fn()
    render(<StarRating value={0} readonly onChange={onChange} />)
    const user = userEvent.setup()
    await user.click(screen.getAllByRole('button')[2])
    expect(onChange).not.toHaveBeenCalled()
  })
})
