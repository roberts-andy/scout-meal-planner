import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { __setFeatureFlagsForTests } from '@/lib/featureFlags'
import { SharedEventPage } from './SharedEventPage'

const { getByToken } = vi.hoisted(() => ({ getByToken: vi.fn() }))

vi.mock('@/lib/api', () => ({
  shareApi: {
    getByToken,
  },
}))

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

describe('SharedEventPage feature flag handling', () => {
  beforeEach(() => {
    getByToken.mockReset()
  })

  it('shows disabled message and skips API call when shared-links flag is off', () => {
    __setFeatureFlagsForTests({ 'enable-shared-links': false })

    render(<SharedEventPage token="token-1" />, { wrapper: createWrapper() })

    expect(screen.getByText('Shared links are currently disabled.')).toBeInTheDocument()
    expect(getByToken).not.toHaveBeenCalled()
  })

  it('shows disabled message on 503 response even when flag was enabled locally', async () => {
    __setFeatureFlagsForTests({ 'enable-shared-links': true })
    const error = new Error('Shared links feature is disabled (HTTP 503)') as Error & { status?: number }
    error.status = 503
    getByToken.mockRejectedValueOnce(error)

    render(<SharedEventPage token="token-1" />, { wrapper: createWrapper() })

    expect(await screen.findByText('Shared links are currently disabled.')).toBeInTheDocument()
  })
})
