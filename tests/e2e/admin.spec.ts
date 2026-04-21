/**
 * E2E tests — Troop Admin tab functionality.
 * Tests member management and admin features (troopAdmin role required).
 */

import { test, expect, E2E_USER } from '../fixtures/auth'
import { AdminPage } from '../pages/AdminPage'

test.describe('Troop Admin', () => {
  test.beforeEach(async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText(E2E_USER.displayName)).toBeVisible({ timeout: 15_000 })
  })

  test('admin tab is visible for troopAdmin role', async ({ authedPage }) => {
    const adminPage = new AdminPage(authedPage)
    await expect(adminPage.adminTab).toBeVisible()
  })

  test('can navigate to Admin tab', async ({ authedPage }) => {
    const adminPage = new AdminPage(authedPage)
    await adminPage.navigate()
    await adminPage.expectVisible()
  })

  test('shows member list with test user', async ({ authedPage }) => {
    const adminPage = new AdminPage(authedPage)
    await adminPage.navigate()

    // The E2E test member should appear in the members list
    await adminPage.expectMemberVisible(E2E_USER.displayName)
  })

  test('shows invite code', async ({ authedPage }) => {
    const adminPage = new AdminPage(authedPage)
    await adminPage.navigate()

    // The troop invite code should be displayed
    await expect(authedPage.getByText('E2E-TEST')).toBeVisible()
  })
})
