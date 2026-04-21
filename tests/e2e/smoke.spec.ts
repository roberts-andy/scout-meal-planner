import { test, expect } from '@playwright/test'

/**
 * Smoke test: the app loads and shows the sign-in screen when unauthenticated.
 * This catches build/bundle regressions without requiring a live backend.
 */
test('app loads and renders sign-in when unauthenticated', async ({ page }) => {
  await page.goto('/')
  // The SignIn component shows the app brand; fall back to any rendered text.
  await expect(page.locator('body')).not.toBeEmpty()
  // The page should not be a blank error page.
  await expect(page).toHaveTitle(/.+/)
  // Should show sign-in UI when not authenticated
  await expect(page.getByText(/sign in/i)).toBeVisible({ timeout: 10_000 })
})
