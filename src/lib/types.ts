// ── Auth & Multi-tenancy ──

export type TroopRole = 'troopAdmin' | 'adultLeader' | 'seniorPatrolLeader' | 'patrolLeader' | 'scout'
export type MemberStatus = 'active' | 'pending' | 'deactivated' | 'removed'

export interface Troop {
  id: string
  name: string
  inviteCode: string
  createdBy: string
  createdAt: number
  updatedAt: number
}

export interface TroopMember {
  id: string
  troopId: string
  userId: string
  email: string
  displayName: string
  role: TroopRole
  status: MemberStatus
  invitedAt?: number
  joinedAt: number
}

export interface AuthUser {
  userId: string
  email: string
  displayName: string
}

export interface AuthContext {
  user: AuthUser
  troopId: string
  role: TroopRole
}

// ── Audit ──

export interface AuditInfo {
  userId: string
  displayName: string
}

// ── Meal Planning ──

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'
export type MealCourse = 'main' | 'side' | 'dessert' | 'snack'

export type CookingMethod = 'open-fire' | 'camp-stove' | 'dutch-oven' | 'skillet' | 'grill' | 'no-cook' | 'other'

export type IngredientUnit = 'cup' | 'tbsp' | 'tsp' | 'oz' | 'lb' | 'g' | 'kg' | 'ml' | 'l' | 'whole' | 'package' | 'can' | 'to-taste'

export interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: IngredientUnit
  estimatedPrice?: number
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
  troopId: string
  name: string
  description?: string
  servings: number
  ingredients: Ingredient[]
  variations: RecipeVariation[]
  tags?: string[]
  clonedFrom?: string
  createdAt: number
  updatedAt: number
  createdBy?: AuditInfo
  updatedBy?: AuditInfo
  currentVersion: number
  versions: RecipeVersion[]
}

export interface Meal {
  id: string
  type: MealType
  course?: MealCourse
  dietaryNotes?: string
  name?: string
  recipeId?: string
  scoutCount: number
  isTrailside?: boolean
  isTimeConstrained?: boolean
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
  troopId: string
  name: string
  startDate: string
  endDate: string
  days: EventDay[]
  packedItems?: string[]
  purchasedItems?: string[]
  notes?: string
  hike?: boolean
  highAltitude?: boolean
  tentCamping?: boolean
  cabinCamping?: boolean
  powerAvailable?: boolean
  runningWater?: boolean
  trailerAccess?: boolean
  expectedWeather?: string
  description?: string
  link?: string
  shareToken?: string
  shareTokenUpdatedAt?: number
  createdAt: number
  updatedAt: number
  createdBy?: AuditInfo
  updatedBy?: AuditInfo
}

export interface SharedRecipe {
  id: string
  name: string
  servings: number
  ingredients: Ingredient[]
  variations: Array<{ id: string; equipment: string[] }>
}

export interface SharedEvent {
  id: string
  name: string
  startDate: string
  endDate: string
  days: EventDay[]
  hike?: boolean
  highAltitude?: boolean
  tentCamping?: boolean
  cabinCamping?: boolean
  powerAvailable?: boolean
  runningWater?: boolean
  trailerAccess?: boolean
  expectedWeather?: string
}

export interface SharedEventPlan {
  event: SharedEvent
  recipes: SharedRecipe[]
}

export interface FeedbackRating {
  taste: number
  difficulty: number
  portionSize: number
}

export interface MealFeedback {
  id: string
  troopId: string
  eventId: string
  mealId: string
  recipeId: string
  scoutName?: string
  rating: FeedbackRating
  comments: string
  whatWorked: string
  whatToChange: string
  photos?: string[]
  createdAt: number
  updatedAt?: number
  eventName?: string
  eventDate?: string
  createdBy?: AuditInfo
  updatedBy?: AuditInfo
}

export type FlaggedContentType = 'recipe' | 'feedback'
export type FlaggedContentAction = 'approve' | 'edit' | 'reject'

export interface FlaggedContentItem {
  id: string
  contentId: string
  contentType: FlaggedContentType
  flagReason: string
  flaggedAt: number
  moderation?: {
    status?: string
    flaggedFields?: string[]
    checkedAt?: number
  }
  context: {
    name?: string
    description?: string
    servings?: number
    eventId?: string
    recipeId?: string
    comments?: string
    whatWorked?: string
    whatToChange?: string
    rating?: FeedbackRating
  }
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
