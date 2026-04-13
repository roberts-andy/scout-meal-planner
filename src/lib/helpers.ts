import { Ingredient, Recipe, Event, Meal, ShoppingListItem, IngredientUnit } from './types'

export function scaleIngredient(ingredient: Ingredient, originalServings: number, targetServings: number): Ingredient {
  const scaleFactor = targetServings / originalServings
  const scaledQuantity = ingredient.quantity * scaleFactor
  
  return {
    ...ingredient,
    quantity: roundToFraction(scaledQuantity)
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
