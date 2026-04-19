import { MealFeedback } from './types'

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
