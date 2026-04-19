import { Event, Recipe } from './types'

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
