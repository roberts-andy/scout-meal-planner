import { Event, Recipe, MealFeedback } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Link as LinkIcon } from '@phosphor-icons/react'
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
  onUpdateFeedback: (feedback: MealFeedback) => void
  onDeleteFeedback: (feedbackId: string) => void
  onUpdateRecipe: (recipe: Recipe) => void
}

export function EventDetail({
  event,
  recipes,
  feedback,
  onUpdateEvent,
  onBack,
  onAddFeedback,
  onUpdateFeedback,
  onDeleteFeedback,
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
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <p className="text-muted-foreground">
              {event.days.length} days • {event.days.reduce((acc, day) => acc + day.meals.length, 0)} meals planned
            </p>
            {(event.hike || event.highAltitude || event.tentCamping || event.cabinCamping) && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex flex-wrap gap-1.5">
                  {event.hike && <Badge variant="secondary" className="text-xs">Hike</Badge>}
                  {event.highAltitude && <Badge variant="secondary" className="text-xs">High Altitude</Badge>}
                  {event.tentCamping && <Badge variant="secondary" className="text-xs">Tent Camping</Badge>}
                  {event.cabinCamping && <Badge variant="secondary" className="text-xs">Cabin Camping</Badge>}
                </div>
              </>
            )}
          </div>
          {event.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{event.description}</p>
          )}
          {event.link && (
            <a 
              href={event.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
            >
              <LinkIcon size={16} />
              Event Link
            </a>
          )}
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
              onUpdateFeedback={onUpdateFeedback}
              onDeleteFeedback={onDeleteFeedback}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
