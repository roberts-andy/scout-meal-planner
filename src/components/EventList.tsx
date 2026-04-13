import { useState } from 'react'
import { Event } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Calendar, Trash } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { CreateEventDialog } from './CreateEventDialog'
import { motion } from 'framer-motion'

interface EventListProps {
  events: Event[]
  onSelectEvent: (eventId: string) => void
  onCreateEvent: (event: Event) => void
  onDeleteEvent: (eventId: string) => void
}

export function EventList({ events, onSelectEvent, onCreateEvent, onDeleteEvent }: EventListProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <Calendar size={64} weight="duotone" className="text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No events yet</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Create your first camping trip or event to start planning meals for your scouts
        </p>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="gap-2">
          <Plus size={20} />
          Create First Event
        </Button>
        <CreateEventDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreateEvent={onCreateEvent}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Your Events</h2>
          <p className="text-muted-foreground mt-1">Manage camping trips and meal plans</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus size={20} />
          New Event
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] group"
              onClick={() => onSelectEvent(event.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{event.name}</CardTitle>
                    <CardDescription className="mt-1.5">
                      {format(new Date(event.startDate), 'MMM d')} -{' '}
                      {format(new Date(event.endDate), 'MMM d, yyyy')}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteEvent(event.id)
                    }}
                  >
                    <Trash size={18} className="text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{event.days.length} days</span>
                    <span>•</span>
                    <span>{event.days.reduce((acc, day) => acc + day.meals.length, 0)} meals</span>
                  </div>
                  {(event.hike || event.highAltitude || event.tentCamping || event.cabinCamping) && (
                    <div className="flex flex-wrap gap-1.5">
                      {event.hike && <Badge variant="secondary" className="text-xs">Hike</Badge>}
                      {event.highAltitude && <Badge variant="secondary" className="text-xs">High Altitude</Badge>}
                      {event.tentCamping && <Badge variant="secondary" className="text-xs">Tent Camping</Badge>}
                      {event.cabinCamping && <Badge variant="secondary" className="text-xs">Cabin Camping</Badge>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <CreateEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateEvent={onCreateEvent}
      />
    </div>
  )
}
