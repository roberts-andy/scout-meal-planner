/**
 * Page Object Model for the Recipes tab — recipe list, create/edit/delete, filtering.
 */

import { type Page, type Locator, expect } from '@playwright/test'

export class RecipesPage {
  readonly page: Page
  readonly recipesTab: Locator
  readonly createButton: Locator
  readonly searchInput: Locator

  constructor(page: Page) {
    this.page = page
    this.recipesTab = page.getByRole('tab', { name: /recipes/i })
    this.createButton = page.getByRole('button', { name: /new recipe|create recipe|add recipe/i })
    this.searchInput = page.getByPlaceholder(/search/i)
  }

  async navigate() {
    await this.recipesTab.click()
  }

  async expectVisible() {
    await expect(this.recipesTab).toHaveAttribute('data-state', 'active')
  }

  async clickCreate() {
    await this.createButton.click()
  }

  async selectRecipe(name: string) {
    await this.page.getByText(name, { exact: false }).click()
  }

  async search(query: string) {
    await this.searchInput.fill(query)
  }

  async expectRecipeVisible(name: string) {
    await expect(this.page.getByText(name)).toBeVisible()
  }
}
