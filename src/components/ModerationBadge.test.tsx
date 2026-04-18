import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ModerationBadge } from './ModerationBadge'

describe('ModerationBadge', () => {
  it('renders "Approved" for approved status', () => {
    render(<ModerationBadge status="approved" />)
    expect(screen.getByText('Approved')).toBeDefined()
  })

  it('renders "Flagged" for flagged status', () => {
    render(<ModerationBadge status="flagged" />)
    expect(screen.getByText('Flagged')).toBeDefined()
  })

  it('renders "Pending Review" for pending status', () => {
    render(<ModerationBadge status="pending" />)
    expect(screen.getByText('Pending Review')).toBeDefined()
  })

  it('uses destructive variant for flagged status', () => {
    const { container } = render(<ModerationBadge status="flagged" />)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge?.className).toContain('destructive')
  })

  it('passes className prop through', () => {
    const { container } = render(<ModerationBadge status="approved" className="custom-class" />)
    const badge = container.querySelector('[data-slot="badge"]')
    expect(badge?.className).toContain('custom-class')
  })
})
