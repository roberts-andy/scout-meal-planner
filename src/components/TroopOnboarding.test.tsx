import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TroopOnboarding } from './TroopOnboarding'

const { joinMock, createMock } = vi.hoisted(() => ({
  joinMock: vi.fn(),
  createMock: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  troopsApi: {
    join: joinMock,
    create: createMock,
  },
}))

describe('TroopOnboarding invite links', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    joinMock.mockReset()
    createMock.mockReset()
  })

  it('prefills invite code from URL and starts on join tab', () => {
    window.history.pushState({}, '', '/join?code=troop-a3x9')

    render(<TroopOnboarding onComplete={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /join troop/i })).toHaveAttribute('data-state', 'active')
    expect(screen.getByLabelText(/invite code/i)).toHaveValue('TROOP-A3X9')
    expect(screen.getByRole('button', { name: /join troop/i })).toBeEnabled()
  })

  it('joins with the invite code from URL parameter', async () => {
    window.history.pushState({}, '', '/join?code=troop-a3x9')
    joinMock.mockResolvedValueOnce({ troop: {}, member: {} })
    const onComplete = vi.fn()
    const user = userEvent.setup()

    render(<TroopOnboarding onComplete={onComplete} />)

    await user.click(screen.getByRole('button', { name: /join troop/i }))

    expect(joinMock).toHaveBeenCalledWith('TROOP-A3X9')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
