import { Event } from './types'

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
