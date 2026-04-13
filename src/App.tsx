import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Event, Recipe, MealFeedback } from '@/lib/types'
import { migrateRecipeToVersioning } from '@/lib/helpers'
import { EventList } from '@/components/EventList'
import { RecipeLibrary } from '@/components/RecipeLibrary'
import { EventDetail } from '@/components/EventDetail'
import { VersioningTest } from '@/components/VersioningTest'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, CookingPot, Flask } from '@phosphor-icons/react'

export default function App() {
  const [events, setEvents] = useKV<Event[]>('scout-events', [])
  const [recipes, setRecipes] = useKV<Recipe[]>('scout-recipes', [])
  const [feedback, setFeedback] = useKV<MealFeedback[]>('scout-feedback', [])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'events' | 'recipes' | 'test'>('events')

  useEffect(() => {
    if (recipes && recipes.length > 0) {
      const needsMigration = recipes.some(r => r.currentVersion === undefined)
      if (needsMigration) {
        const migratedRecipes = recipes.map(migrateRecipeToVersioning)
        setRecipes(migratedRecipes)
      }
    }
  }, [])

  const selectedEvent = (events || []).find(e => e.id === selectedEventId)

  const handleCreateEvent = (event: Event) => {
    setEvents(current => [...(current || []), event])
    setSelectedEventId(event.id)
  }

  const handleUpdateEvent = (updatedEvent: Event) => {
    setEvents(current =>
      (current || []).map(e => e.id === updatedEvent.id ? updatedEvent : e)
    )
  }

  const handleDeleteEvent = (eventId: string) => {
    setEvents(current => (current || []).filter(e => e.id !== eventId))
    if (selectedEventId === eventId) {
      setSelectedEventId(null)
    }
  }

  const handleCreateRecipe = (recipe: Recipe) => {
    setRecipes(current => [...(current || []), recipe])
  }

  const handleUpdateRecipe = (updatedRecipe: Recipe) => {
    setRecipes(current =>
      (current || []).map(r => r.id === updatedRecipe.id ? updatedRecipe : r)
    )
  }

  const handleDeleteRecipe = (recipeId: string) => {
    setRecipes(current => (current || []).filter(r => r.id !== recipeId))
  }

  const handleAddFeedback = (newFeedback: MealFeedback) => {
    setFeedback(current => [...(current || []), newFeedback])
  }

  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        recipes={recipes || []}
        feedback={feedback || []}
        onUpdateEvent={handleUpdateEvent}
        onBack={() => setSelectedEventId(null)}
        onAddFeedback={handleAddFeedback}
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
              events={events || []}
              onSelectEvent={setSelectedEventId}
              onCreateEvent={handleCreateEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          </TabsContent>

          <TabsContent value="recipes" className="mt-0">
            <RecipeLibrary
              recipes={recipes || []}
              feedback={feedback || []}
              onCreateRecipe={handleCreateRecipe}
              onUpdateRecipe={handleUpdateRecipe}
              onDeleteRecipe={handleDeleteRecipe}
            />
          </TabsContent>

          <TabsContent value="test" className="mt-0">
            <VersioningTest
              events={events || []}
              recipes={recipes || []}
              onUpdateRecipe={handleUpdateRecipe}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
