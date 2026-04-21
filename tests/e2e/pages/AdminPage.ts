/**
 * Page Object Model for the Troop Admin tab — member management, flagged content.
 */

import { type Page, type Locator, expect } from '@playwright/test'

export class AdminPage {
  readonly page: Page
  readonly adminTab: Locator
  readonly membersSection: Locator
  readonly inviteCodeDisplay: Locator

  constructor(page: Page) {
    this.page = page
    this.adminTab = page.getByRole('tab', { name: /admin/i })
    this.membersSection = page.getByText(/members/i).first()
    this.inviteCodeDisplay = page.getByText(/invite code|E2E-TEST/i)
  }

  async navigate() {
    await this.adminTab.click()
  }

  async expectVisible() {
    await expect(this.adminTab).toHaveAttribute('data-state', 'active')
  }

  async expectMemberVisible(name: string) {
    await expect(this.page.getByText(name)).toBeVisible()
  }
}
