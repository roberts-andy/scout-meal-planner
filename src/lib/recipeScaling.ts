import { Ingredient, Recipe, IngredientUnit } from './types'

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
