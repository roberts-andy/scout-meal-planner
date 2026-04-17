import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// RTL's automatic cleanup only runs when Vitest globals are enabled.
// We keep globals off and unmount mounted trees manually after each test.
afterEach(() => {
  cleanup()
})
