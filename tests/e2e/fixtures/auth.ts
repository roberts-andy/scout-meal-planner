/**
 * Playwright auth fixture — injects MSAL sessionStorage state so the React app
 * sees an authenticated user without hitting Azure AD.
 *
 * The injected account returns "e2e-test-token" as the idToken, which the
 * FastAPI backend accepts when E2E_TEST_MODE=true.
 */

import { test as base, type Page } from '@playwright/test'

/** Well-known values matching the API's E2E auth bypass. */
export const E2E_USER = {
  userId: 'e2e-test-user',
  email: 'e2e@test.local',
  displayName: 'E2E Test User',
} as const

/**
 * Client ID must match what the Vite app uses at runtime.
 * Both the app (authConfig.ts) and this fixture read from VITE_ENTRA_CLIENT_ID.
 * Falls back to the known dev/test value if unset.
 */
const CLIENT_ID = process.env.VITE_ENTRA_CLIENT_ID || '42871bb7-a693-4d97-9cb9-69bbf9a50ff4'
const AUTHORITY = 'https://login.microsoftonline.com/consumers'

/**
 * Build the MSAL v5 sessionStorage entries that make the React app believe
 * the user is signed in. MSAL stores:
 *   1. An account entity keyed by homeAccountId-environment-realm
 *   2. An idToken credential entity
 *   3. A list of active accounts
 */
function buildMsalSessionState() {
  const homeAccountId = `${E2E_USER.userId}.9188040d-6c67-4c5b-b112-36a304b66dad`
  const environment = 'login.microsoftonline.com'
  const realm = '9188040d-6c67-4c5b-b112-36a304b66dad'

  const accountKey = `${homeAccountId}-${environment}-${realm}`
  const account = {
    homeAccountId,
    environment,
    realm,
    localAccountId: E2E_USER.userId,
    username: E2E_USER.email,
    name: E2E_USER.displayName,
    authorityType: 'MSSTS',
    clientInfo: '',
    idTokenClaims: {
      sub: E2E_USER.userId,
      preferred_username: E2E_USER.email,
      name: E2E_USER.displayName,
      aud: CLIENT_ID,
      iss: `https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0`,
      emails: [E2E_USER.email],
    },
  }

  const idTokenKey = `${homeAccountId}-${environment}-idtoken-${CLIENT_ID}-${realm}---`
  const idToken = {
    homeAccountId,
    environment,
    credentialType: 'IdToken',
    clientId: CLIENT_ID,
    realm,
    secret: 'e2e-test-token',
    target: '',
  }

  // MSAL active accounts key
  const activeAccountKey = `msal.${CLIENT_ID}.active-account`

  return { accountKey, account, idTokenKey, idToken, activeAccountKey, homeAccountId }
}

/**
 * Inject MSAL auth state into sessionStorage before the page loads.
 * Call this in addInitScript so it runs before React/MSAL initialize.
 */
async function injectMsalAuth(page: Page) {
  const state = buildMsalSessionState()

  await page.addInitScript(({ accountKey, account, idTokenKey, idToken, activeAccountKey, homeAccountId }) => {
    sessionStorage.setItem(accountKey, JSON.stringify(account))
    sessionStorage.setItem(idTokenKey, JSON.stringify(idToken))
    sessionStorage.setItem(activeAccountKey, homeAccountId)
  }, state)
}

/**
 * Extended Playwright test fixtures with an `authedPage` that is pre-authenticated.
 */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await injectMsalAuth(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
