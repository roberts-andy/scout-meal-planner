import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { __setFeatureFlagsForTests, isFeatureEnabled, loadFeatureFlags } from './featureFlags'

describe('loadFeatureFlags', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    __setFeatureFlagsForTests({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
  })

  it('prefers backend /api/feature-flags response when available', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ 'enable-shared-links': true }), { status: 200 }))
    global.fetch = fetchMock

    await loadFeatureFlags()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/feature-flags', { cache: 'no-store' })
    expect(isFeatureEnabled('enable-shared-links')).toBe(true)
  })

  it('falls back to runtime.config.json when backend flags request fails', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ featureFlags: { 'enable-shared-links': true } }), { status: 200 }))
    global.fetch = fetchMock

    await loadFeatureFlags()

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/feature-flags', { cache: 'no-store' })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/runtime.config.json', { cache: 'no-store' })
    expect(isFeatureEnabled('enable-shared-links')).toBe(true)
  })
})
