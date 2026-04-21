import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { shareApi } from '@/lib/api'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { Event, Recipe } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EventShoppingList } from './EventShoppingList'
import { EventEquipment } from './EventEquipment'
import { format } from 'date-fns'

interface SharedEventPageProps {
  token: string
}

// Shared view reuses existing Event/Recipe display components that expect these fields.
const SHARED_EVENT_PLACEHOLDER_TROOP_ID = 'shared'
const SHARED_EVENT_PLACEHOLDER_RECIPE_VERSION = 1
const SHARED_LINKS_DISABLED_MESSAGE = 'Shared links are currently disabled.'

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || !error || !('status' in error)) return undefined
  return typeof error.status === 'number' ? error.status : undefined
}

export function SharedEventPage({ token }: SharedEventPageProps) {
  const sharedLinksEnabled = isFeatureEnabled('enable-shared-links')
  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-event', token],
    queryFn: () => shareApi.getByToken(token),
    enabled: sharedLinksEnabled,
  })

  const event = useMemo<Event | null>(() => {
    if (!data) return null
    return {
      ...data.event,
      troopId: SHARED_EVENT_PLACEHOLDER_TROOP_ID,
      createdAt: 0,
      updatedAt: 0,
    }
  }, [data])

  const recipes = useMemo<Recipe[]>(() => {
    if (!data) return []
    return data.recipes.map((recipe) => ({
      ...recipe,
      troopId: SHARED_EVENT_PLACEHOLDER_TROOP_ID,
      createdAt: 0,
      updatedAt: 0,
      currentVersion: SHARED_EVENT_PLACEHOLDER_RECIPE_VERSION,
      versions: [],
      variations: recipe.variations.map((variation) => ({
        id: variation.id,
        cookingMethod: 'other',
        instructions: [],
        equipment: variation.equipment,
      })),
    }))
  }, [data])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading shared event...</p>
      </div>
    )
  }

  if (!sharedLinksEnabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <p className="text-destructive font-semibold">Shared event is unavailable</p>
          <p className="text-muted-foreground text-sm">{SHARED_LINKS_DISABLED_MESSAGE}</p>
        </div>
      </div>
    )
  }

  const statusCode = getErrorStatus(error)

  if (statusCode === 503) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <p className="text-destructive font-semibold">Shared event is unavailable</p>
          <p className="text-muted-foreground text-sm">{SHARED_LINKS_DISABLED_MESSAGE}</p>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <p className="text-destructive font-semibold">Shared event is unavailable</p>
          <p className="text-muted-foreground text-sm">
            This link may be invalid or has been revoked.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Shared event plan</p>
          <h1 className="text-3xl font-bold text-primary tracking-tight">{event.name}</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(event.startDate), 'MMM d, yyyy')} – {format(new Date(event.endDate), 'MMM d, yyyy')}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-8">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="shopping">Shopping List</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-0">
            <div className="space-y-6">
              {event.days.map((day, dayIndex) => (
                <Card key={day.date}>
                  <CardHeader>
                    <CardTitle>Day {dayIndex + 1}</CardTitle>
                    <CardDescription>{format(new Date(day.date), 'EEEE, MMMM d')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {day.meals.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No meals planned for this day</p>
                    ) : (
                      <div className="space-y-3">
                        {day.meals.map((meal) => {
                          const recipe = meal.recipeId ? recipes.find((r) => r.id === meal.recipeId) : null
                          return (
                            <div key={meal.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="capitalize">{meal.type}</Badge>
                                {meal.course && <Badge variant="outline" className="capitalize">{meal.course}</Badge>}
                                {recipe && <span className="font-medium">{recipe.name}</span>}
                                {meal.isTrailside && <Badge variant="outline" className="text-xs">Trailside</Badge>}
                                {meal.isTimeConstrained && <Badge variant="outline" className="text-xs">Time-Constrained</Badge>}
                              </div>
                              <span className="text-sm text-muted-foreground">{meal.scoutCount} scouts</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="shopping" className="mt-0">
            <EventShoppingList event={event} recipes={recipes} />
          </TabsContent>

          <TabsContent value="equipment" className="mt-0">
            <EventEquipment event={event} recipes={recipes} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
