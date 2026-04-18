import { useState } from 'react'
import { Event, EventDay } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format, eachDayOfInterval } from 'date-fns'
import type { DateRange } from 'react-day-picker'

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateEvent: (event: Event) => void
}

export function CreateEventDialog({ open, onOpenChange, onCreateEvent }: CreateEventDialogProps) {
  const [name, setName] = useState('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [hike, setHike] = useState(false)
  const [highAltitude, setHighAltitude] = useState(false)
  const [tentCamping, setTentCamping] = useState(false)
  const [cabinCamping, setCabinCamping] = useState(false)

  const handleSubmit = () => {
    if (!name || !dateRange?.from || !dateRange?.to) return

    const days: EventDay[] = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to
    }).map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      meals: []
    }))

    const newEvent: Event = {
      id: `event-${Date.now()}`,
      name,
      startDate: format(dateRange.from, 'yyyy-MM-dd'),
      endDate: format(dateRange.to, 'yyyy-MM-dd'),
      days,
      description: description || undefined,
      link: link || undefined,
      hike: hike || undefined,
      highAltitude: highAltitude || undefined,
      tentCamping: tentCamping || undefined,
      cabinCamping: cabinCamping || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    onCreateEvent(newEvent)
    setName('')
    setDateRange(undefined)
    setDescription('')
    setLink('')
    setHike(false)
    setHighAltitude(false)
    setTentCamping(false)
    setCabinCamping(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Set up a new camping trip or event. You'll be able to add meals after creating the event.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="event-name">Event Name</Label>
            <Input
              id="event-name"
              placeholder="e.g., Summer Camp 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              placeholder="Brief description of the trip..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label>Trip Dates</Label>
            <div className="text-sm text-muted-foreground">
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d, yyyy')} — {format(dateRange.to, 'MMM d, yyyy')}
                  </>
                ) : (
                  <>
                    {format(dateRange.from, 'MMM d, yyyy')} — <span className="italic">select end date</span>
                  </>
                )
              ) : (
                'Select start and end dates'
              )}
            </div>
            <CalendarComponent
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              disabled={{ before: new Date() }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Event Characteristics</Label>
            <div className="grid gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hike"
                  checked={hike}
                  onCheckedChange={(checked) => setHike(checked as boolean)}
                />
                <Label htmlFor="hike" className="cursor-pointer font-normal">Hike</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="high-altitude"
                  checked={highAltitude}
                  onCheckedChange={(checked) => setHighAltitude(checked as boolean)}
                />
                <Label htmlFor="high-altitude" className="cursor-pointer font-normal">High Altitude</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tent-camping"
                  checked={tentCamping}
                  onCheckedChange={(checked) => setTentCamping(checked as boolean)}
                />
                <Label htmlFor="tent-camping" className="cursor-pointer font-normal">Tent Camping</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cabin-camping"
                  checked={cabinCamping}
                  onCheckedChange={(checked) => setCabinCamping(checked as boolean)}
                />
                <Label htmlFor="cabin-camping" className="cursor-pointer font-normal">Cabin Camping</Label>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-link">Link</Label>
            <Input
              id="event-link"
              type="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !dateRange?.from || !dateRange?.to}>
            Create Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
