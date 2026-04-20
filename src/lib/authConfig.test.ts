import { describe, expect, it } from 'vitest'
import { msalConfig } from './authConfig'

describe('msalConfig', () => {
  it('uses sessionStorage for token cache', () => {
    expect(msalConfig.cache?.cacheLocation).toBe('sessionStorage')
    expect(msalConfig.cache?.storeAuthStateInCookie).toBe(false)
  })
})
