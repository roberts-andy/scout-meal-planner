import { useState, useEffect } from 'react'
import { Event, Recipe, MealFeedback } from '@/lib/types'
import { migrateRecipeToVersioning } from '@/lib/versioning'
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/hooks/useEvents'
import { useRecipes, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from '@/hooks/useRecipes'
import { useFeedback, useCreateFeedback, useUpdateFeedback, useDeleteFeedback } from '@/hooks/useFeedback'

export function useAppData() {
  const { data: events = [], isLoading: eventsLoading, error: eventsError } = useEvents()
  const { data: recipes = [], isLoading: recipesLoading, error: recipesError } = useRecipes()
  const { data: feedback = [], isLoading: feedbackLoading, error: feedbackError } = useFeedback()

  const createEvent = useCreateEvent()
  const updateEvent = useUpdateEvent()
  const deleteEvent = useDeleteEvent()
  const createRecipe = useCreateRecipe()
  const updateRecipeMutation = useUpdateRecipe()
  const deleteRecipe = useDeleteRecipe()
  const createFeedback = useCreateFeedback()
  const updateFeedbackMutation = useUpdateFeedback()
  const deleteFeedback = useDeleteFeedback()

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  useEffect(() => {
    if (recipes && recipes.length > 0) {
      const needsMigration = recipes.some(r => r.currentVersion === undefined)
      if (needsMigration) {
        recipes.map(migrateRecipeToVersioning).forEach(r => updateRecipeMutation.mutate(r))
      }
    }
  }, [recipes.length])

  const selectedEvent = events.find(e => e.id === selectedEventId)

  const handleCreateEvent = (event: Event) => {
    createEvent.mutate(event)
    setSelectedEventId(event.id)
  }

  const handleUpdateEvent = (updatedEvent: Event) => {
    updateEvent.mutate(updatedEvent)
  }

  const handleDeleteEvent = (eventId: string) => {
    deleteEvent.mutate(eventId)
    if (selectedEventId === eventId) {
      setSelectedEventId(null)
    }
  }

  const handleCreateRecipe = (recipe: Recipe) => {
    createRecipe.mutate(recipe)
  }

  const handleUpdateRecipe = (updatedRecipe: Recipe) => {
    updateRecipeMutation.mutate(updatedRecipe)
  }

  const handleDeleteRecipe = (recipeId: string) => {
    deleteRecipe.mutate(recipeId)
  }

  const handleAddFeedback = (newFeedback: MealFeedback) => {
    createFeedback.mutate(newFeedback)
  }

  const handleUpdateFeedback = (updatedFeedback: MealFeedback) => {
    updateFeedbackMutation.mutate(updatedFeedback)
  }

  const handleDeleteFeedback = (feedbackId: string) => {
    deleteFeedback.mutate(feedbackId)
  }

  const queryError = eventsError || recipesError || feedbackError
  const isLoading = eventsLoading || recipesLoading || feedbackLoading
  const failedResources = queryError
    ? [eventsError && 'events', recipesError && 'recipes', feedbackError && 'feedback'].filter(Boolean).join(', ')
    : null

  return {
    // Data
    events,
    recipes,
    feedback,
    selectedEvent,
    selectedEventId,
    setSelectedEventId,
    // Status
    isLoading,
    queryError,
    failedResources,
    // Handlers
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleCreateRecipe,
    handleUpdateRecipe,
    handleDeleteRecipe,
    handleAddFeedback,
    handleUpdateFeedback,
    handleDeleteFeedback,
  }
}
