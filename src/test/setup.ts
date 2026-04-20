import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { __setFeatureFlagsForTests } from '@/lib/featureFlags'

__setFeatureFlagsForTests({
  'enable-content-moderation': true,
  'enable-email-shopping-list': true,
  'enable-shared-links': true,
  'enable-feedback': true,
  'enable-print-recipes': true,
})

// RTL's automatic cleanup only runs when Vitest globals are enabled.
// We keep globals off and unmount mounted trees manually after each test.
afterEach(() => {
  cleanup()
})
