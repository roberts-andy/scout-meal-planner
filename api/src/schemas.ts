import { z, ZodError } from 'zod'

// ── Shared value schemas ──

const mealType = z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'other'])
const mealCourse = z.enum(['main', 'side', 'dessert', 'snack'])
const cookingMethod = z.enum(['open-fire', 'camp-stove', 'dutch-oven', 'skillet', 'grill', 'no-cook', 'other'])
const ingredientUnit = z.enum(['cup', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'whole', 'package', 'can', 'to-taste'])
const troopRole = z.enum(['troopAdmin', 'adultLeader', 'seniorPatrolLeader', 'patrolLeader', 'scout'])
const memberStatus = z.enum(['active', 'pending', 'deactivated', 'removed'])

// ── Nested object schemas ──

const ingredientSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  quantity: z.number().min(0),
  unit: ingredientUnit,
  estimatedPrice: z.number().min(0).optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
})

const recipeVariationSchema = z.object({
  id: z.string(),
  cookingMethod,
  instructions: z.array(z.string()),
  equipment: z.array(z.string()),
  cookingTime: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  notes: z.string().optional(),
})

const recipeVersionSchema = z.object({
  versionNumber: z.number().int().min(1),
  eventId: z.string().optional(),
  eventName: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  servings: z.number().int().min(1),
  ingredients: z.array(ingredientSchema),
  variations: z.array(recipeVariationSchema),
  tags: z.array(z.string()).optional(),
  createdAt: z.number(),
  changeNote: z.string().optional(),
})

const mealSchema = z.object({
  id: z.string(),
  type: mealType,
  course: mealCourse.optional(),
  dietaryNotes: z.string().optional(),
  name: z.string().optional(),
  recipeId: z.string().optional(),
  scoutCount: z.number().int().min(0),
  isTrailside: z.boolean().optional(),
  isTimeConstrained: z.boolean().optional(),
  selectedVariationId: z.string().optional(),
  notes: z.string().optional(),
  time: z.string().optional(),
})

const eventDaySchema = z.object({
  date: z.string(),
  meals: z.array(mealSchema),
})

const feedbackRatingSchema = z.object({
  taste: z.number().min(1).max(5),
  difficulty: z.number().min(1).max(5),
  portionSize: z.number().min(1).max(5),
})

// ── API input schemas ──

export const createTroopSchema = z.object({
  name: z.string().min(1).max(100),
})

export const updateTroopSchema = z.object({
  name: z.string().min(1).max(100),
})

export const joinTroopSchema = z.object({
  inviteCode: z.string().min(1),
})

export const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  days: z.array(eventDaySchema),
  packedItems: z.array(z.string()).optional(),
  purchasedItems: z.array(z.string()).optional(),
  notes: z.string().optional(),
  hike: z.boolean().optional(),
  highAltitude: z.boolean().optional(),
  tentCamping: z.boolean().optional(),
  cabinCamping: z.boolean().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
})

export const updateEventSchema = createEventSchema

export const togglePackedItemSchema = z.object({
  item: z.string().min(1),
  packed: z.boolean(),
})

export const togglePurchasedItemSchema = z.object({
  item: z.string().min(1),
  purchased: z.boolean(),
})

const shoppingListEmailItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().min(0),
  unit: z.string().min(1).max(50),
})

export const emailShoppingListSchema = z.object({
  recipientEmail: z.string().email(),
  items: z.array(shoppingListEmailItemSchema).min(1),
})

export const createRecipeSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  servings: z.number().int().min(1),
  ingredients: z.array(ingredientSchema),
  variations: z.array(recipeVariationSchema),
  tags: z.array(z.string()).optional(),
  clonedFrom: z.string().optional(),
  currentVersion: z.number().int().min(1).optional(),
  versions: z.array(recipeVersionSchema).optional(),
})

export const updateRecipeSchema = createRecipeSchema

export const createFeedbackSchema = z.object({
  eventId: z.string().min(1),
  mealId: z.string().min(1),
  recipeId: z.string().min(1),
  scoutName: z.string().optional(),
  rating: feedbackRatingSchema,
  comments: z.string(),
  whatWorked: z.string(),
  whatToChange: z.string(),
  photos: z.array(z.string()).optional(),
})

export const updateFeedbackSchema = createFeedbackSchema

export const updateMemberSchema = z.object({
  role: troopRole.optional(),
  status: memberStatus.optional(),
})

export const createMemberSchema = z.object({
  displayName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  role: troopRole,
}).superRefine((data, ctx) => {
  if (data.role !== 'scout' && !data.email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['email'],
      message: 'Email is required for non-scout members',
    })
  }
})

/** Format a ZodError into an HTTP 400 response */
export function validationError(error: ZodError) {
  return {
    status: 400 as const,
    jsonBody: {
      error: 'Invalid request body',
      details: error.flatten().fieldErrors,
    },
  }
}
