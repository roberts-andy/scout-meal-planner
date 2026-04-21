/**
 * Page Object Model for the Events tab — event list, create/edit/delete.
 */

import { type Page, type Locator, expect } from '@playwright/test'

export class EventsPage {
  readonly page: Page
  readonly eventsTab: Locator
  readonly createButton: Locator
  readonly eventList: Locator
  readonly searchInput: Locator

  constructor(page: Page) {
    this.page = page
    this.eventsTab = page.getByRole('tab', { name: /events/i })
    this.createButton = page.getByRole('button', { name: /new event|create event/i })
    this.eventList = page.locator('[data-testid="event-list"], main')
    this.searchInput = page.getByPlaceholder(/search/i)
  }

  async navigate() {
    await this.eventsTab.click()
  }

  async expectVisible() {
    await expect(this.eventsTab).toHaveAttribute('data-state', 'active')
  }

  async clickCreate() {
    await this.createButton.click()
  }

  async selectEvent(name: string) {
    await this.page.getByText(name, { exact: false }).click()
  }

  async search(query: string) {
    await this.searchInput.fill(query)
  }

  async expectEventVisible(name: string) {
    await expect(this.page.getByText(name)).toBeVisible()
  }

  async expectEventCount(count: number) {
    // Each event card is typically a clickable element in the list
    const cards = this.page.locator('[data-testid="event-card"], [role="button"]').filter({ hasText: /\w+/ })
    await expect(cards).toHaveCount(count)
  }
}
