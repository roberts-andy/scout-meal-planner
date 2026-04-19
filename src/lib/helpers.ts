import { Ingredient, Recipe, Event, Meal, ShoppingListItem, IngredientUnit, RecipeVersion, MealFeedback, FeedbackRating } from './types'

export function scaleIngredient(ingredient: Ingredient, originalServings: number, targetServings: number): Ingredient {
  const scaleFactor = targetServings / originalServings
  const scaledQuantity = ingredient.quantity * scaleFactor
  
  return {
    ...ingredient,
    quantity: roundToFraction(scaledQuantity),
    estimatedPrice: ingredient.estimatedPrice !== undefined
      ? Math.round(ingredient.estimatedPrice * scaleFactor * 100) / 100
      : undefined
  }
}

export function scaleRecipe(recipe: Recipe, targetServings: number): Recipe {
  return {
    ...recipe,
    servings: targetServings,
    ingredients: recipe.ingredients.map(ing => 
      scaleIngredient(ing, recipe.servings, targetServings)
    )
  }
}

function roundToFraction(num: number): number {
  const commonFractions = [
    { decimal: 0.125, fraction: '⅛' },
    { decimal: 0.25, fraction: '¼' },
    { decimal: 0.333, fraction: '⅓' },
    { decimal: 0.5, fraction: '½' },
    { decimal: 0.667, fraction: '⅔' },
    { decimal: 0.75, fraction: '¾' }
  ]
  
  const wholePart = Math.floor(num)
  const fractionalPart = num - wholePart
  
  if (fractionalPart < 0.05) return wholePart
  
  for (const frac of commonFractions) {
    if (Math.abs(fractionalPart - frac.decimal) < 0.05) {
      return wholePart + frac.decimal
    }
  }
  
  return Math.round(num * 4) / 4
}

export function formatQuantity(quantity: number, unit: IngredientUnit): string {
  const fractionMap: { [key: number]: string } = {
    0.125: '⅛',
    0.25: '¼',
    0.333: '⅓',
    0.5: '½',
    0.667: '⅔',
    0.75: '¾'
  }
  
  if (unit === 'to-taste') return ''
  
  const wholePart = Math.floor(quantity)
  const fractionalPart = quantity - wholePart
  
  let result = ''
  
  if (wholePart > 0) {
    result += wholePart.toString()
  }
  
  if (fractionalPart > 0.05) {
    const closestFraction = Object.entries(fractionMap).reduce((prev, curr) => {
      const prevDiff = Math.abs(parseFloat(prev[0]) - fractionalPart)
      const currDiff = Math.abs(parseFloat(curr[0]) - fractionalPart)
      return currDiff < prevDiff ? curr : prev
    })
    
    if (result) result += ' '
    result += closestFraction[1]
  }
  
  return result || '0'
}

export function generateShoppingList(
  event: Event,
  recipes: Recipe[],
  checkedItems: Set<string> = new Set()
): ShoppingListItem[] {
  const ingredientMap = new Map<string, ShoppingListItem>()
  
  event.days.forEach(day => {
    day.meals.forEach(meal => {
      if (!meal.recipeId) return
      
      const recipe = recipes.find(r => r.id === meal.recipeId)
      if (!recipe) return
      
      const scaledRecipe = scaleRecipe(recipe, meal.scoutCount)
      
      scaledRecipe.ingredients.forEach(ingredient => {
        const key = `${ingredient.name.toLowerCase()}-${ingredient.unit}`
        
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key)!
          existing.totalQuantity += ingredient.quantity
          if (ingredient.estimatedPrice !== undefined) {
            existing.ingredient.estimatedPrice = Math.round(
              ((existing.ingredient.estimatedPrice ?? 0) + ingredient.estimatedPrice) * 100
            ) / 100
          }
          if (!existing.recipes.includes(recipe.name)) {
            existing.recipes.push(recipe.name)
          }
        } else {
          ingredientMap.set(key, {
            ingredient: { ...ingredient },
            recipes: [recipe.name],
            totalQuantity: ingredient.quantity,
            checked: checkedItems.has(key)
          })
        }
      })
    })
  })
  
  return Array.from(ingredientMap.values()).sort((a, b) => 
    a.ingredient.name.localeCompare(b.ingredient.name)
  )
}

export function categorizeIngredients(items: ShoppingListItem[]): Map<string, ShoppingListItem[]> {
  const categories = new Map<string, ShoppingListItem[]>()
  
  const categoryMap: { [key: string]: string[] } = {
    'produce': ['onion', 'garlic', 'tomato', 'potato', 'carrot', 'celery', 'pepper', 'lettuce', 'spinach', 'mushroom', 'apple', 'banana', 'orange', 'lemon', 'lime'],
    'meat': ['chicken', 'beef', 'pork', 'turkey', 'sausage', 'bacon', 'ham', 'ground', 'steak'],
    'dairy': ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg'],
    'pantry': ['flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'rice', 'pasta', 'bread', 'cereal'],
    'canned': ['can', 'beans', 'soup', 'sauce', 'tomato paste'],
    'spices': ['cumin', 'paprika', 'oregano', 'basil', 'thyme', 'cinnamon', 'chili', 'seasoning'],
    'beverages': ['water', 'juice', 'soda', 'coffee', 'tea']
  }
  
  items.forEach(item => {
    const ingredientName = item.ingredient.name.toLowerCase()
    let category = item.ingredient.category || 'other'
    
    if (!item.ingredient.category) {
      for (const [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some((keyword: string) => ingredientName.includes(keyword))) {
          category = cat
          break
        }
      }
    }
    
    if (!categories.has(category)) {
      categories.set(category, [])
    }
    categories.get(category)!.push(item)
  })
  
  return categories
}

export function getEquipmentList(event: Event, recipes: Recipe[]): Map<string, number> {
  const equipmentMap = new Map<string, number>()
  
  event.days.forEach(day => {
    day.meals.forEach(meal => {
      if (!meal.recipeId || !meal.selectedVariationId) return
      
      const recipe = recipes.find(r => r.id === meal.recipeId)
      if (!recipe) return
      
      const variation = recipe.variations.find(v => v.id === meal.selectedVariationId)
      if (!variation) return
      
      variation.equipment.forEach(item => {
        const current = equipmentMap.get(item) || 0
        equipmentMap.set(item, current + 1)
      })
    })
  })
  
  return equipmentMap
}

export function migrateRecipeToVersioning(recipe: Recipe): Recipe {
  if (recipe.currentVersion !== undefined && recipe.versions !== undefined) {
    return recipe
  }
  
  return {
    ...recipe,
    currentVersion: 1,
    versions: [],
  }
}

export function isRecipeInEvent(recipeId: string, event: Event): boolean {
  return event.days.some(day => 
    day.meals.some(meal => meal.recipeId === recipeId)
  )
}

export function isEventActive(event: Event): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(event.endDate)
  endDate.setHours(23, 59, 59, 999)
  return today <= endDate
}

export function canSubmitEventFeedback(event: Event): boolean {
  const [year, month, day] = event.endDate.slice(0, 10).split('-').map(Number)
  const endDateStart = Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? new Date(year, month - 1, day)
    : (() => {
        const parsed = new Date(event.endDate)
        parsed.setHours(0, 0, 0, 0)
        return parsed
      })()

  return Date.now() >= endDateStart.getTime()
}

export function getRecipeEventVersion(recipe: Recipe, eventId: string): RecipeVersion | undefined {
  return recipe.versions.find(v => v.eventId === eventId)
}

export function shouldCreateNewVersion(recipe: Recipe, eventId: string): boolean {
  return !getRecipeEventVersion(recipe, eventId)
}

export interface RecipeRatingsSummary {
  recipeId: string
  recipeName: string
  totalFeedback: number
  averageRatings: {
    taste: number
    difficulty: number
    portionSize: number
  }
  overallAverage: number
  eventCount: number
}

export function calculateRecipeRatings(
  recipeId: string,
  recipeName: string,
  feedback: MealFeedback[]
): RecipeRatingsSummary | null {
  const recipeFeedback = feedback.filter(f => f.recipeId === recipeId)
  
  if (recipeFeedback.length === 0) {
    return null
  }

  const totalTaste = recipeFeedback.reduce((sum, f) => sum + f.rating.taste, 0)
  const totalDifficulty = recipeFeedback.reduce((sum, f) => sum + f.rating.difficulty, 0)
  const totalPortionSize = recipeFeedback.reduce((sum, f) => sum + f.rating.portionSize, 0)
  
  const count = recipeFeedback.length
  const averageRatings = {
    taste: totalTaste / count,
    difficulty: totalDifficulty / count,
    portionSize: totalPortionSize / count
  }
  
  const overallAverage = (averageRatings.taste + averageRatings.difficulty + averageRatings.portionSize) / 3
  
  const uniqueEvents = new Set(recipeFeedback.map(f => f.eventId))
  
  return {
    recipeId,
    recipeName,
    totalFeedback: count,
    averageRatings,
    overallAverage,
    eventCount: uniqueEvents.size
  }
}

export function revertRecipeToVersion(recipe: Recipe, targetVersion: number): Recipe {
  const versionToRevert = recipe.versions.find(v => v.versionNumber === targetVersion)
  
  if (!versionToRevert) {
    return recipe
  }

  const newVersionNumber = recipe.currentVersion + 1
  
  const currentSnapshot: RecipeVersion = {
    versionNumber: recipe.currentVersion,
    eventId: undefined,
    eventName: undefined,
    name: recipe.name,
    description: recipe.description,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    variations: recipe.variations,
    tags: recipe.tags,
    createdAt: recipe.updatedAt,
    changeNote: `Before reverting to v${targetVersion}`,
  }

  return {
    ...recipe,
    name: versionToRevert.name,
    description: versionToRevert.description,
    servings: versionToRevert.servings,
    ingredients: versionToRevert.ingredients.map(ing => ({ ...ing, id: crypto.randomUUID() })),
    variations: versionToRevert.variations.map(v => ({ ...v, id: crypto.randomUUID() })),
    tags: versionToRevert.tags,
    currentVersion: newVersionNumber,
    updatedAt: Date.now(),
    versions: [
      currentSnapshot,
      {
        versionNumber: newVersionNumber,
        eventId: undefined,
        eventName: undefined,
        name: versionToRevert.name,
        description: versionToRevert.description,
        servings: versionToRevert.servings,
        ingredients: versionToRevert.ingredients,
        variations: versionToRevert.variations,
        tags: versionToRevert.tags,
        createdAt: Date.now(),
        changeNote: `Reverted to v${targetVersion}`,
      },
      ...recipe.versions
    ],
  }
}
