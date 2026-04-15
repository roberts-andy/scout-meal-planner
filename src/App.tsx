import { useState, useEffect } from 'react'
import { Event, Recipe, MealFeedback } from '@/lib/types'
import { migrateRecipeToVersioning } from '@/lib/helpers'
import { EventList } from '@/components/EventList'
import { RecipeLibrary } from '@/components/RecipeLibrary'
import { EventDetail } from '@/components/EventDetail'
import { VersioningTest } from '@/components/VersioningTest'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, CookingPot, Flask } from '@phosphor-icons/react'
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '@/hooks/useEvents'
import { useRecipes, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from '@/hooks/useRecipes'
import { useFeedback, useCreateFeedback, useUpdateFeedback, useDeleteFeedback } from '@/hooks/useFeedback'

export default function App() {
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
  const [activeTab, setActiveTab] = useState<'events' | 'recipes' | 'test'>('events')

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
    const fb = feedback.find(f => f.id === feedbackId)
    if (fb) {
      deleteFeedback.mutate({ id: feedbackId, eventId: fb.eventId })
    }
  }

  const queryError = eventsError || recipesError || feedbackError
  if (queryError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-destructive font-semibold">Failed to load data</p>
          <p className="text-muted-foreground text-sm">{queryError.message}</p>
        </div>
      </div>
    )
  }

  if (eventsLoading || recipesLoading || feedbackLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        recipes={recipes}
        feedback={feedback}
        onUpdateEvent={handleUpdateEvent}
        onBack={() => setSelectedEventId(null)}
        onAddFeedback={handleAddFeedback}
        onUpdateFeedback={handleUpdateFeedback}
        onDeleteFeedback={handleDeleteFeedback}
        onUpdateRecipe={handleUpdateRecipe}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-primary tracking-tight">Scout Meal Planner</h1>
          <p className="text-muted-foreground mt-1">Plan events, manage recipes, and organize meals</p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'events' | 'recipes' | 'test')} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-8">
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar size={18} />
              Events
            </TabsTrigger>
            <TabsTrigger value="recipes" className="flex items-center gap-2">
              <CookingPot size={18} />
              Recipes
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Flask size={18} />
              Test Versioning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-0">
            <EventList
              events={events}
              onSelectEvent={setSelectedEventId}
              onCreateEvent={handleCreateEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          </TabsContent>

          <TabsContent value="recipes" className="mt-0">
            <RecipeLibrary
              recipes={recipes}
              feedback={feedback}
              onCreateRecipe={handleCreateRecipe}
              onUpdateRecipe={handleUpdateRecipe}
              onDeleteRecipe={handleDeleteRecipe}
            />
          </TabsContent>

          <TabsContent value="test" className="mt-0">
            <VersioningTest
              events={events}
              recipes={recipes}
              onUpdateRecipe={handleUpdateRecipe}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
