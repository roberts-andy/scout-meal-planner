/**
 * E2E tests — Authentication flow.
 * Verifies that the MSAL mock correctly authenticates and the app renders.
 */

import { test, expect, E2E_USER } from '../fixtures/auth'

test.describe('Authentication', () => {
  test('authenticated user sees the Events tab by default', async ({ authedPage }) => {
    await authedPage.goto('/')

    // Should show the app header with user name
    await expect(authedPage.getByText(E2E_USER.displayName)).toBeVisible({ timeout: 15_000 })

    // Should show the main app title
    await expect(authedPage.getByText('Scout Meal Planner')).toBeVisible()

    // Events tab should be active by default
    const eventsTab = authedPage.getByRole('tab', { name: /events/i })
    await expect(eventsTab).toBeVisible()
  })

  test('authenticated user sees navigation tabs', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText(E2E_USER.displayName)).toBeVisible({ timeout: 15_000 })

    // Should have Events and Recipes tabs
    await expect(authedPage.getByRole('tab', { name: /events/i })).toBeVisible()
    await expect(authedPage.getByRole('tab', { name: /recipes/i })).toBeVisible()

    // Admin tab should be visible (test user is troopAdmin)
    await expect(authedPage.getByRole('tab', { name: /admin/i })).toBeVisible()
  })

  test('sign out button is visible', async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText(E2E_USER.displayName)).toBeVisible({ timeout: 15_000 })

    await expect(authedPage.getByRole('button', { name: /sign out/i })).toBeVisible()
  })
})
