export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'

export type CookingMethod = 'open-fire' | 'camp-stove' | 'dutch-oven' | 'skillet' | 'grill' | 'no-cook' | 'other'

export type IngredientUnit = 'cup' | 'tbsp' | 'tsp' | 'oz' | 'lb' | 'g' | 'kg' | 'ml' | 'l' | 'whole' | 'package' | 'can' | 'to-taste'

export interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: IngredientUnit
  category?: string
  notes?: string
}

export interface RecipeVariation {
  id: string
  cookingMethod: CookingMethod
  instructions: string[]
  equipment: string[]
  cookingTime?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  notes?: string
}

export interface RecipeVersion {
  versionNumber: number
  eventId?: string
  eventName?: string
  name: string
  description?: string
  servings: number
  ingredients: Ingredient[]
  variations: RecipeVariation[]
  tags?: string[]
  createdAt: number
  changeNote?: string
}

export interface Recipe {
  id: string
  name: string
  description?: string
  servings: number
  ingredients: Ingredient[]
  variations: RecipeVariation[]
  tags?: string[]
  clonedFrom?: string
  createdAt: number
  updatedAt: number
  currentVersion: number
  versions: RecipeVersion[]
}

export interface Meal {
  id: string
  type: MealType
  name?: string
  recipeId?: string
  scoutCount: number
  selectedVariationId?: string
  notes?: string
  time?: string
}

export interface EventDay {
  date: string
  meals: Meal[]
}

export interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
  days: EventDay[]
  notes?: string
  createdAt: number
  updatedAt: number
}

export interface FeedbackRating {
  taste: number
  difficulty: number
  portionSize: number
}

export interface MealFeedback {
  id: string
  eventId: string
  mealId: string
  recipeId: string
  scoutName?: string
  rating: FeedbackRating
  comments: string
  whatWorked: string
  whatToChange: string
  createdAt: number
}

export interface ShoppingListItem {
  ingredient: Ingredient
  recipes: string[]
  totalQuantity: number
  checked: boolean
}

export interface ShoppingList {
  eventId: string
  items: ShoppingListItem[]
  categories: Map<string, ShoppingListItem[]>
}
