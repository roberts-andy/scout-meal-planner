import { useState, useMemo } from 'react'
import { Recipe, MealFeedback, CookingMethod } from '@/lib/types'
import { calculateRecipeRatings } from '@/lib/ratings'

export type SortOption = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest' | 'rating-high' | 'rating-low'

export const COOKING_METHODS: { value: CookingMethod; label: string }[] = [
  { value: 'open-fire', label: 'Open Fire' },
  { value: 'camp-stove', label: 'Camp Stove' },
  { value: 'dutch-oven', label: 'Dutch Oven' },
  { value: 'skillet', label: 'Skillet' },
  { value: 'grill', label: 'Grill' },
  { value: 'no-cook', label: 'No Cook' },
  { value: 'other', label: 'Other' },
]

export function useRecipeFiltering(recipes: Recipe[], feedback: MealFeedback[]) {
  const [minRating, setMinRating] = useState<number>(0)
  const [showRatingFilter, setShowRatingFilter] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('date-newest')
  const [selectedCookingMethods, setSelectedCookingMethods] = useState<CookingMethod[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])

  const allEquipment = useMemo(() => {
    const equipmentSet = new Set<string>()
    recipes.forEach(recipe => {
      recipe.variations.forEach(variation => {
        variation.equipment.forEach(eq => equipmentSet.add(eq))
      })
    })
    return Array.from(equipmentSet).sort()
  }, [recipes])

  const filteredRecipes = useMemo(() => {
    let filtered = recipes

    if (minRating > 0) {
      filtered = filtered.filter(recipe => {
        const ratingSummary = calculateRecipeRatings(recipe.id, recipe.name, feedback)
        if (!ratingSummary) return false
        return ratingSummary.overallAverage >= minRating
      })
    }

    if (selectedCookingMethods.length > 0) {
      filtered = filtered.filter(recipe =>
        recipe.variations.some(variation =>
          selectedCookingMethods.includes(variation.cookingMethod)
        )
      )
    }

    if (selectedEquipment.length > 0) {
      filtered = filtered.filter(recipe =>
        recipe.variations.some(variation =>
          selectedEquipment.some(eq => variation.equipment.includes(eq))
        )
      )
    }

    return filtered
  }, [recipes, feedback, minRating, selectedCookingMethods, selectedEquipment])

  const sortedRecipes = useMemo(() => {
    const sorted = [...filteredRecipes]

    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name))
      case 'date-newest':
        return sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      case 'date-oldest':
        return sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      case 'rating-high':
        return sorted.sort((a, b) => {
          const ratingA = calculateRecipeRatings(a.id, a.name, feedback)?.overallAverage || 0
          const ratingB = calculateRecipeRatings(b.id, b.name, feedback)?.overallAverage || 0
          return ratingB - ratingA
        })
      case 'rating-low':
        return sorted.sort((a, b) => {
          const ratingA = calculateRecipeRatings(a.id, a.name, feedback)?.overallAverage || 0
          const ratingB = calculateRecipeRatings(b.id, b.name, feedback)?.overallAverage || 0
          return ratingA - ratingB
        })
      default:
        return sorted
    }
  }, [filteredRecipes, sortBy, feedback])

  const handleResetFilter = () => {
    setMinRating(0)
    setShowRatingFilter(false)
  }

  const handleResetAllFilters = () => {
    setMinRating(0)
    setShowRatingFilter(false)
    setShowFilters(false)
    setSelectedCookingMethods([])
    setSelectedEquipment([])
  }

  const toggleCookingMethod = (method: CookingMethod) => {
    setSelectedCookingMethods(current =>
      current.includes(method)
        ? current.filter(m => m !== method)
        : [...current, method]
    )
  }

  const toggleEquipment = (equipment: string) => {
    setSelectedEquipment(current =>
      current.includes(equipment)
        ? current.filter(e => e !== equipment)
        : [...current, equipment]
    )
  }

  const hasActiveFilters = minRating > 0 || selectedCookingMethods.length > 0 || selectedEquipment.length > 0

  return {
    // State
    minRating,
    setMinRating,
    showRatingFilter,
    setShowRatingFilter,
    showFilters,
    setShowFilters,
    sortBy,
    setSortBy,
    selectedCookingMethods,
    selectedEquipment,
    allEquipment,
    // Derived
    filteredRecipes,
    sortedRecipes,
    hasActiveFilters,
    // Actions
    handleResetFilter,
    handleResetAllFilters,
    toggleCookingMethod,
    toggleEquipment,
  }
}
