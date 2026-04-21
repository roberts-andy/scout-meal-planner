/**
 * E2E tests — Recipes tab functionality.
 * Tests recipe listing, navigation, and detail view.
 */

import { test, expect, E2E_USER } from '../fixtures/auth'
import { RecipesPage } from '../pages/RecipesPage'

test.describe('Recipes', () => {
  test.beforeEach(async ({ authedPage }) => {
    await authedPage.goto('/')
    await expect(authedPage.getByText(E2E_USER.displayName)).toBeVisible({ timeout: 15_000 })
  })

  test('can navigate to Recipes tab', async ({ authedPage }) => {
    const recipesPage = new RecipesPage(authedPage)
    await recipesPage.navigate()
    await recipesPage.expectVisible()
  })

  test('displays seeded recipes', async ({ authedPage }) => {
    const recipesPage = new RecipesPage(authedPage)
    await recipesPage.navigate()

    await recipesPage.expectRecipeVisible('E2E Camp Chili')
    await recipesPage.expectRecipeVisible('E2E Pancakes')
  })

  test('can open recipe detail', async ({ authedPage }) => {
    const recipesPage = new RecipesPage(authedPage)
    await recipesPage.navigate()
    await recipesPage.selectRecipe('E2E Camp Chili')

    // Should show recipe details (ingredients, instructions)
    await expect(authedPage.getByText(/ground beef/i)).toBeVisible()
    await expect(authedPage.getByText(/kidney beans/i)).toBeVisible()
  })

  test('create recipe button is visible', async ({ authedPage }) => {
    const recipesPage = new RecipesPage(authedPage)
    await recipesPage.navigate()

    await expect(authedPage.getByRole('button', { name: /new recipe|create recipe|add recipe/i })).toBeVisible()
  })
})
