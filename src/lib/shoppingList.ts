import { Event, Recipe, ShoppingListItem } from './types'
import { scaleRecipe } from './recipeScaling'

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
