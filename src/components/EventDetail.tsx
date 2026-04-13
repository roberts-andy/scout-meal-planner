import { Event, Recipe, MealFeedback } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventSchedule } from './EventSchedule'
import { EventShoppingList } from './EventShoppingList'
import { EventEquipment } from './EventEquipment'
import { EventFeedback } from './EventFeedback'

interface EventDetailProps {
  event: Event
  recipes: Recipe[]
  feedback: MealFeedback[]
  onUpdateEvent: (event: Event) => void
  onBack: () => void
  onAddFeedback: (feedback: MealFeedback) => void
  onUpdateRecipe: (recipe: Recipe) => void
}

export function EventDetail({
  event,
  recipes,
  feedback,
  onUpdateEvent,
  onBack,
  onAddFeedback,
  onUpdateRecipe
}: EventDetailProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <Button
            variant="ghost"
            className="gap-2 mb-3"
            onClick={onBack}
          >
            <ArrowLeft size={20} />
            Back to Events
          </Button>
          <h1 className="text-3xl font-bold text-primary tracking-tight">{event.name}</h1>
          <p className="text-muted-foreground mt-1">
            {event.days.length} days • {event.days.reduce((acc, day) => acc + day.meals.length, 0)} meals planned
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-8">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="shopping">Shopping List</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-0">
            <EventSchedule
              event={event}
              recipes={recipes}
              onUpdateEvent={onUpdateEvent}
              onUpdateRecipe={onUpdateRecipe}
            />
          </TabsContent>

          <TabsContent value="shopping" className="mt-0">
            <EventShoppingList
              event={event}
              recipes={recipes}
            />
          </TabsContent>

          <TabsContent value="equipment" className="mt-0">
            <EventEquipment
              event={event}
              recipes={recipes}
            />
          </TabsContent>

          <TabsContent value="feedback" className="mt-0">
            <EventFeedback
              event={event}
              recipes={recipes}
              feedback={feedback}
              onAddFeedback={onAddFeedback}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
