/**
 * Page Object Model for the Event Detail view — schedule, shopping list, equipment.
 */

import { type Page, type Locator, expect } from '@playwright/test'

export class EventDetailPage {
  readonly page: Page
  readonly backButton: Locator
  readonly eventName: Locator
  readonly scheduleSection: Locator
  readonly shoppingListSection: Locator
  readonly equipmentSection: Locator

  constructor(page: Page) {
    this.page = page
    this.backButton = page.getByRole('button', { name: /back|←/i })
    this.eventName = page.getByRole('heading', { level: 1 }).or(page.getByRole('heading', { level: 2 }))
    this.scheduleSection = page.getByText(/schedule|meals/i).first()
    this.shoppingListSection = page.getByText(/shopping list/i).first()
    this.equipmentSection = page.getByText(/equipment/i).first()
  }

  async expectVisible(eventName?: string) {
    if (eventName) {
      await expect(this.page.getByText(eventName)).toBeVisible()
    }
    await expect(this.backButton).toBeVisible()
  }

  async goBack() {
    await this.backButton.click()
  }

  async expectShoppingListHasItems() {
    await expect(this.page.locator('text=/\\d+.*\\w+/')).toBeVisible()
  }
}
