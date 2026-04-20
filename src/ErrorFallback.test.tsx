import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from './ErrorFallback'

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Boom')
  return <div>Recovered</div>
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorFallback', () => {
  it('renders fallback UI when a child throws and supports recovery', async () => {
    const user = userEvent.setup()
    const reset = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary
        FallbackComponent={(props) => <ErrorFallback {...props} resetErrorBoundary={reset} />}
      >
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('This spark has encountered a runtime error')).toBeInTheDocument()
    expect(screen.getByText(/Something unexpected happened while running the application/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(reset).toHaveBeenCalledTimes(1)
    consoleError.mockRestore()
  })
})
