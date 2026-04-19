// Barrel re-export — all helpers available from '@/lib/helpers' for backward compatibility.
// New code should import directly from the domain module.
export { scaleIngredient, scaleRecipe, formatQuantity } from './recipeScaling'
export { generateShoppingList, categorizeIngredients } from './shoppingList'
export { getEquipmentList } from './equipment'
export { migrateRecipeToVersioning, getRecipeEventVersion, shouldCreateNewVersion, revertRecipeToVersion } from './versioning'
export { isRecipeInEvent, isEventActive, canSubmitEventFeedback } from './eventUtils'
export { calculateRecipeRatings } from './ratings'
export type { RecipeRatingsSummary } from './ratings'
