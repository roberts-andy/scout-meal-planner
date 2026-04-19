import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  scaleIngredient,
  scaleRecipe,
  formatQuantity,
  generateShoppingList,
  categorizeIngredients,
  getEquipmentList,
  migrateRecipeToVersioning,
  isRecipeInEvent,
  isEventActive,
  canSubmitEventFeedback,
  getRecipeEventVersion,
  shouldCreateNewVersion,
  calculateRecipeRatings,
  revertRecipeToVersion,
} from './helpers'
import type { Ingredient, Recipe, Event, MealFeedback, RecipeVersion, ShoppingListItem } from './types'

// ── Test Fixtures ──

function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'ing-1',
    name: 'Flour',
    quantity: 2,
    unit: 'cup',
    ...overrides,
  }
}

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'recipe-1',
    name: 'Pancakes',
    servings: 4,
    ingredients: [
      makeIngredient(),
      makeIngredient({ id: 'ing-2', name: 'Sugar', quantity: 0.25, unit: 'cup' }),
    ],
    variations: [
      {
        id: 'var-1',
        cookingMethod: 'camp-stove',
        instructions: ['Mix', 'Cook'],
        equipment: ['Skillet', 'Spatula'],
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    currentVersion: 1,
    versions: [],
    ...overrides,
  }
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    name: 'Summer Camp',
    startDate: '2025-07-01',
    endDate: '2025-07-03',
    days: [
      {
        date: '2025-07-01',
        meals: [
          { id: 'meal-1', type: 'breakfast', scoutCount: 8, recipeId: 'recipe-1', selectedVariationId: 'var-1' },
        ],
      },
      {
        date: '2025-07-02',
        meals: [
          { id: 'meal-2', type: 'lunch', scoutCount: 10, recipeId: 'recipe-1', selectedVariationId: 'var-1' },
        ],
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

function makeFeedback(overrides: Partial<MealFeedback> = {}): MealFeedback {
  return {
    id: 'fb-1',
    eventId: 'event-1',
    mealId: 'meal-1',
    recipeId: 'recipe-1',
    rating: { taste: 4, difficulty: 3, portionSize: 5 },
    comments: 'Good',
    whatWorked: 'Easy prep',
    whatToChange: 'More syrup',
    createdAt: Date.now(),
    ...overrides,
  }
}

// ── scaleIngredient ──

describe('scaleIngredient', () => {
  it('scales up proportionally', () => {
    const ing = makeIngredient({ quantity: 2 })
    const result = scaleIngredient(ing, 4, 8)
    expect(result.quantity).toBe(4)
    expect(result.name).toBe('Flour')
  })

  it('scales down proportionally', () => {
    const ing = makeIngredient({ quantity: 2 })
    const result = scaleIngredient(ing, 4, 2)
    expect(result.quantity).toBe(1)
  })

  it('rounds to nearest fraction', () => {
    const ing = makeIngredient({ quantity: 1 })
    const result = scaleIngredient(ing, 3, 4)
    // 1 * 4/3 = 1.333... → should round to 1.333 (≈ 1⅓)
    expect(result.quantity).toBeCloseTo(1.333, 1)
  })

  it('preserves other ingredient fields', () => {
    const ing = makeIngredient({ category: 'pantry', notes: 'sifted', estimatedPrice: 3.5 })
    const result = scaleIngredient(ing, 4, 4)
    expect(result.category).toBe('pantry')
    expect(result.notes).toBe('sifted')
    expect(result.unit).toBe('cup')
    expect(result.estimatedPrice).toBe(3.5)
  })

  it('scales estimatedPrice proportionally', () => {
    const ing = makeIngredient({ estimatedPrice: 2 })
    const result = scaleIngredient(ing, 4, 10)
    expect(result.estimatedPrice).toBe(5)
  })

  it('rounds scaled estimatedPrice to 2 decimals', () => {
    const ing = makeIngredient({ estimatedPrice: 1.99 })
    const result = scaleIngredient(ing, 3, 4)
    expect(result.estimatedPrice).toBe(2.65)
  })
})

// ── scaleRecipe ──

describe('scaleRecipe', () => {
  it('scales all ingredients to target servings', () => {
    const recipe = makeRecipe({ servings: 4 })
    const scaled = scaleRecipe(recipe, 8)
    expect(scaled.servings).toBe(8)
    expect(scaled.ingredients[0].quantity).toBe(4) // 2 cups flour → 4
    expect(scaled.ingredients[1].quantity).toBe(0.5) // 0.25 cups sugar → 0.5
  })

  it('returns same quantities when target equals base servings', () => {
    const recipe = makeRecipe({ servings: 4 })
    const scaled = scaleRecipe(recipe, 4)
    expect(scaled.ingredients[0].quantity).toBe(2)
    expect(scaled.ingredients[1].quantity).toBe(0.25)
  })

  it('does not mutate the original recipe', () => {
    const recipe = makeRecipe()
    const original = recipe.ingredients[0].quantity
    scaleRecipe(recipe, 100)
    expect(recipe.ingredients[0].quantity).toBe(original)
  })
})

// ── formatQuantity ──

describe('formatQuantity', () => {
  it('returns whole numbers as strings', () => {
    expect(formatQuantity(3, 'cup')).toBe('3')
  })

  it('returns fraction for 0.5', () => {
    expect(formatQuantity(0.5, 'cup')).toBe('½')
  })

  it('returns fraction for 0.25', () => {
    expect(formatQuantity(0.25, 'cup')).toBe('¼')
  })

  it('returns whole + fraction for 1.5', () => {
    expect(formatQuantity(1.5, 'cup')).toBe('1 ½')
  })

  it('returns empty string for to-taste unit', () => {
    expect(formatQuantity(1, 'to-taste')).toBe('')
  })

  it('returns 0 for zero quantity', () => {
    expect(formatQuantity(0, 'cup')).toBe('0')
  })

  it('returns fraction for 0.333', () => {
    expect(formatQuantity(0.333, 'cup')).toBe('⅓')
  })

  it('returns fraction for 0.667', () => {
    expect(formatQuantity(0.667, 'cup')).toBe('⅔')
  })

  it('returns fraction for 0.75', () => {
    expect(formatQuantity(0.75, 'cup')).toBe('¾')
  })
})

// ── generateShoppingList ──

describe('generateShoppingList', () => {
  it('generates shopping list from event meals', () => {
    const recipes = [makeRecipe()]
    const event = makeEvent()
    const list = generateShoppingList(event, recipes)
    expect(list.length).toBeGreaterThan(0)
  })

  it('aggregates quantities for same ingredient across meals', () => {
    const recipes = [makeRecipe()]
    const event = makeEvent()
    const list = generateShoppingList(event, recipes)
    // Flour is used in both meals, should be summed
    const flour = list.find(item => item.ingredient.name === 'Flour')
    expect(flour).toBeDefined()
    // Meal 1: 8 scouts (4 base → 2x), Meal 2: 10 scouts (4 base → 2.5x)
    // Flour base: 2 cups → 4 + 5 = 9
    expect(flour!.totalQuantity).toBeGreaterThan(2)
  })

  it('returns empty list when no meals have recipes', () => {
    const event = makeEvent({
      days: [{ date: '2025-07-01', meals: [{ id: 'meal-1', type: 'breakfast', scoutCount: 8 }] }],
    })
    const list = generateShoppingList(event, [])
    expect(list).toEqual([])
  })

  it('tracks which recipes use each ingredient', () => {
    const recipes = [makeRecipe()]
    const event = makeEvent()
    const list = generateShoppingList(event, recipes)
    const flour = list.find(item => item.ingredient.name === 'Flour')
    expect(flour!.recipes).toContain('Pancakes')
  })

  it('sorts items alphabetically', () => {
    const recipes = [makeRecipe()]
    const event = makeEvent()
    const list = generateShoppingList(event, recipes)
    for (let i = 1; i < list.length; i++) {
      expect(list[i].ingredient.name.localeCompare(list[i - 1].ingredient.name)).toBeGreaterThanOrEqual(0)
    }
  })

  it('aggregates estimated prices when provided', () => {
    const recipes = [makeRecipe({
      ingredients: [
        makeIngredient({ estimatedPrice: 2 }),
      ],
    })]
    const event = makeEvent()
    const list = generateShoppingList(event, recipes)
    const flour = list.find(item => item.ingredient.name === 'Flour')
    // Price scales with servings per meal: $2 * (8/4) + $2 * (10/4) = $4 + $5 = $9
    expect(flour?.ingredient.estimatedPrice).toBe(9)
  })

  it('keeps estimatedPrice undefined when not provided', () => {
    const recipes = [makeRecipe({ ingredients: [makeIngredient({ estimatedPrice: undefined })] })]
    const event = makeEvent({ days: [{ date: '2025-07-01', meals: [{ id: 'meal-1', type: 'breakfast', scoutCount: 8, recipeId: 'recipe-1' }] }] })
    const list = generateShoppingList(event, recipes)
    const flour = list.find(item => item.ingredient.name === 'Flour')
    expect(flour?.ingredient.estimatedPrice).toBeUndefined()
  })
})

// ── categorizeIngredients ──

describe('categorizeIngredients', () => {
  it('categorizes by keyword matching', () => {
    const items: ShoppingListItem[] = [
      { ingredient: { id: '1', name: 'Onion', quantity: 2, unit: 'whole' }, recipes: ['Soup'], totalQuantity: 2, checked: false },
      { ingredient: { id: '2', name: 'Chicken breast', quantity: 1, unit: 'lb' }, recipes: ['Soup'], totalQuantity: 1, checked: false },
      { ingredient: { id: '3', name: 'Flour', quantity: 2, unit: 'cup' }, recipes: ['Bread'], totalQuantity: 2, checked: false },
    ]
    const categories = categorizeIngredients(items)
    expect(categories.get('produce')?.some(i => i.ingredient.name === 'Onion')).toBe(true)
    expect(categories.get('meat')?.some(i => i.ingredient.name === 'Chicken breast')).toBe(true)
    expect(categories.get('pantry')?.some(i => i.ingredient.name === 'Flour')).toBe(true)
  })

  it('puts uncategorized items into "other"', () => {
    const items: ShoppingListItem[] = [
      { ingredient: { id: '1', name: 'Mystery food', quantity: 1, unit: 'whole' }, recipes: ['X'], totalQuantity: 1, checked: false },
    ]
    const categories = categorizeIngredients(items)
    expect(categories.get('other')?.length).toBe(1)
  })

  it('respects explicit category on ingredient', () => {
    const items: ShoppingListItem[] = [
      { ingredient: { id: '1', name: 'Onion', quantity: 2, unit: 'whole', category: 'veggies' }, recipes: ['Soup'], totalQuantity: 2, checked: false },
    ]
    const categories = categorizeIngredients(items)
    expect(categories.get('veggies')?.length).toBe(1)
    expect(categories.has('produce')).toBe(false)
  })
})

// ── getEquipmentList ──

describe('getEquipmentList', () => {
  it('collects equipment from all meals with variation', () => {
    const recipes = [makeRecipe()]
    const event = makeEvent()
    const equipment = getEquipmentList(event, recipes)
    expect(equipment.get('Skillet')).toBe(2) // used in 2 meals
    expect(equipment.get('Spatula')).toBe(2)
  })

  it('skips meals without selectedVariationId', () => {
    const recipes = [makeRecipe()]
    const event = makeEvent({
      days: [{ date: '2025-07-01', meals: [{ id: 'meal-1', type: 'breakfast', scoutCount: 8, recipeId: 'recipe-1' }] }],
    })
    const equipment = getEquipmentList(event, recipes)
    expect(equipment.size).toBe(0)
  })

  it('returns empty map for event with no recipes', () => {
    const event = makeEvent({
      days: [{ date: '2025-07-01', meals: [{ id: 'meal-1', type: 'breakfast', scoutCount: 8 }] }],
    })
    const equipment = getEquipmentList(event, [])
    expect(equipment.size).toBe(0)
  })
})

// ── migrateRecipeToVersioning ──

describe('migrateRecipeToVersioning', () => {
  it('adds versioning fields to legacy recipe', () => {
    const legacy = makeRecipe() as any
    delete legacy.currentVersion
    delete legacy.versions
    const migrated = migrateRecipeToVersioning(legacy)
    expect(migrated.currentVersion).toBe(1)
    expect(migrated.versions).toEqual([])
  })

  it('leaves already-versioned recipe unchanged', () => {
    const recipe = makeRecipe({ currentVersion: 3, versions: [{ versionNumber: 1 } as RecipeVersion] })
    const migrated = migrateRecipeToVersioning(recipe)
    expect(migrated.currentVersion).toBe(3)
    expect(migrated.versions).toHaveLength(1)
  })
})

// ── isRecipeInEvent ──

describe('isRecipeInEvent', () => {
  it('returns true when recipe is assigned to a meal', () => {
    const event = makeEvent()
    expect(isRecipeInEvent('recipe-1', event)).toBe(true)
  })

  it('returns false when recipe is not used', () => {
    const event = makeEvent()
    expect(isRecipeInEvent('recipe-999', event)).toBe(false)
  })
})

// ── isEventActive ──

describe('isEventActive', () => {
  it('returns true for future event', () => {
    const event = makeEvent({ endDate: '2099-12-31' })
    expect(isEventActive(event)).toBe(true)
  })

  it('returns false for past event', () => {
    const event = makeEvent({ endDate: '2020-01-01' })
    expect(isEventActive(event)).toBe(false)
  })

  it('returns true for event ending today', () => {
    // Construct today's date in local timezone to match how isEventActive parses dates
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T00:00:00`
    const event = makeEvent({ endDate: today })
    expect(isEventActive(event)).toBe(true)
  })
})

describe('canSubmitEventFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns false for future events', () => {
    vi.setSystemTime(new Date('2026-06-30T12:00:00Z'))
    expect(canSubmitEventFeedback(makeEvent({ endDate: '2026-07-01' }))).toBe(false)
  })

  it('returns true for events ending today', () => {
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'))
    expect(canSubmitEventFeedback(makeEvent({ endDate: '2026-07-01' }))).toBe(true)
  })

  it('returns true for past events', () => {
    vi.setSystemTime(new Date('2026-07-02T12:00:00Z'))
    expect(canSubmitEventFeedback(makeEvent({ endDate: '2026-07-01' }))).toBe(true)
  })
})

// ── getRecipeEventVersion / shouldCreateNewVersion ──

describe('getRecipeEventVersion', () => {
  it('returns version for matching event', () => {
    const version: RecipeVersion = {
      versionNumber: 2,
      eventId: 'event-1',
      name: 'Pancakes v2',
      servings: 4,
      ingredients: [],
      variations: [],
      createdAt: Date.now(),
    }
    const recipe = makeRecipe({ versions: [version] })
    expect(getRecipeEventVersion(recipe, 'event-1')).toEqual(version)
  })

  it('returns undefined for non-matching event', () => {
    const recipe = makeRecipe({ versions: [] })
    expect(getRecipeEventVersion(recipe, 'event-999')).toBeUndefined()
  })
})

describe('shouldCreateNewVersion', () => {
  it('returns true when no version exists for event', () => {
    const recipe = makeRecipe({ versions: [] })
    expect(shouldCreateNewVersion(recipe, 'event-1')).toBe(true)
  })

  it('returns false when version exists for event', () => {
    const version: RecipeVersion = {
      versionNumber: 2,
      eventId: 'event-1',
      name: 'Pancakes v2',
      servings: 4,
      ingredients: [],
      variations: [],
      createdAt: Date.now(),
    }
    const recipe = makeRecipe({ versions: [version] })
    expect(shouldCreateNewVersion(recipe, 'event-1')).toBe(false)
  })
})

// ── calculateRecipeRatings ──

describe('calculateRecipeRatings', () => {
  it('calculates averages from multiple feedback items', () => {
    const feedback = [
      makeFeedback({ rating: { taste: 4, difficulty: 2, portionSize: 5 } }),
      makeFeedback({ id: 'fb-2', rating: { taste: 2, difficulty: 4, portionSize: 3 } }),
    ]
    const result = calculateRecipeRatings('recipe-1', 'Pancakes', feedback)
    expect(result).not.toBeNull()
    expect(result!.averageRatings.taste).toBe(3)
    expect(result!.averageRatings.difficulty).toBe(3)
    expect(result!.averageRatings.portionSize).toBe(4)
    expect(result!.totalFeedback).toBe(2)
  })

  it('returns null when no feedback matches', () => {
    const result = calculateRecipeRatings('recipe-999', 'Unknown', [makeFeedback()])
    expect(result).toBeNull()
  })

  it('counts unique events', () => {
    const feedback = [
      makeFeedback({ eventId: 'event-1' }),
      makeFeedback({ id: 'fb-2', eventId: 'event-1' }),
      makeFeedback({ id: 'fb-3', eventId: 'event-2' }),
    ]
    const result = calculateRecipeRatings('recipe-1', 'Pancakes', feedback)
    expect(result!.eventCount).toBe(2)
  })
})

// ── revertRecipeToVersion ──

describe('revertRecipeToVersion', () => {
  it('reverts recipe to a previous version', () => {
    const oldVersion: RecipeVersion = {
      versionNumber: 1,
      name: 'Old Pancakes',
      description: 'Original recipe',
      servings: 4,
      ingredients: [makeIngredient({ name: 'Old Flour' })],
      variations: [{ id: 'v1', cookingMethod: 'camp-stove', instructions: ['Old step'], equipment: [] }],
      createdAt: Date.now() - 10000,
      changeNote: 'Initial version',
    }
    const recipe = makeRecipe({
      name: 'New Pancakes',
      currentVersion: 2,
      versions: [oldVersion],
    })

    const reverted = revertRecipeToVersion(recipe, 1)
    expect(reverted.name).toBe('Old Pancakes')
    expect(reverted.description).toBe('Original recipe')
    expect(reverted.currentVersion).toBe(3)
    // Should have: backup snapshot of v2 + revert v3 + original v1
    expect(reverted.versions.length).toBe(3)
  })

  it('returns unchanged recipe when target version not found', () => {
    const recipe = makeRecipe({ versions: [] })
    const result = revertRecipeToVersion(recipe, 99)
    expect(result).toEqual(recipe)
  })

  it('does not mutate the original recipe', () => {
    const oldVersion: RecipeVersion = {
      versionNumber: 1,
      name: 'Old',
      servings: 4,
      ingredients: [],
      variations: [],
      createdAt: Date.now(),
    }
    const recipe = makeRecipe({ currentVersion: 2, versions: [oldVersion] })
    const originalName = recipe.name
    revertRecipeToVersion(recipe, 1)
    expect(recipe.name).toBe(originalName)
  })
})
