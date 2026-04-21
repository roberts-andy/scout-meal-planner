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
import { useAuthContext } from '@/components/AuthProvider'
import { format, eachDayOfInterval } from 'date-fns'
import { toast } from 'sonner'
import type { DateRange } from 'react-day-picker'

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateEvent: (event: Event) => void
}

export function CreateEventDialog({ open, onOpenChange, onCreateEvent }: CreateEventDialogProps) {
  const { troopId } = useAuthContext()
  const [name, setName] = useState('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [description, setDescription] = useState('')
  const [link, setLink] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [returnTime, setReturnTime] = useState('')
  const [scoutCount, setScoutCount] = useState(0)
  const [adultCount, setAdultCount] = useState(0)
  const [guestCount, setGuestCount] = useState(0)
  const [hike, setHike] = useState(false)
  const [highAltitude, setHighAltitude] = useState(false)
  const [tentCamping, setTentCamping] = useState(false)
  const [cabinCamping, setCabinCamping] = useState(false)
  const [powerAvailable, setPowerAvailable] = useState(false)
  const [runningWater, setRunningWater] = useState(false)
  const [trailerAccess, setTrailerAccess] = useState(false)
  const [expectedWeather, setExpectedWeather] = useState('')

  const handleSubmit = () => {
    if (!name || !dateRange?.from || !dateRange?.to) return
    if (!troopId) {
      toast.error('You must be in a troop to create an event.')
      return
    }

    const days: EventDay[] = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to
    }).map(date => ({
      date: format(date, 'yyyy-MM-dd'),
      meals: []
    }))

    const newEvent: Event = {
      id: `event-${Date.now()}`,
      troopId,
      name,
      startDate: format(dateRange.from, 'yyyy-MM-dd'),
      endDate: format(dateRange.to, 'yyyy-MM-dd'),
      departureTime: departureTime || undefined,
      returnTime: returnTime || undefined,
      headcount: {
        scoutCount,
        adultCount,
        guestCount,
      },
      days,
      description: description || undefined,
      link: link || undefined,
      hike: hike || undefined,
      highAltitude: highAltitude || undefined,
      tentCamping: tentCamping || undefined,
      cabinCamping: cabinCamping || undefined,
      powerAvailable: powerAvailable || undefined,
      runningWater: runningWater || undefined,
      trailerAccess: trailerAccess || undefined,
      expectedWeather: expectedWeather.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    onCreateEvent(newEvent)
    setName('')
    setDateRange(undefined)
    setDescription('')
    setLink('')
    setDepartureTime('')
    setReturnTime('')
    setScoutCount(0)
    setAdultCount(0)
    setGuestCount(0)
    setHike(false)
    setHighAltitude(false)
    setTentCamping(false)
    setCabinCamping(false)
    setPowerAvailable(false)
    setRunningWater(false)
    setTrailerAccess(false)
    setExpectedWeather('')
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="departure-time">Departure Time</Label>
              <Input
                id="departure-time"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="return-time">Return Time</Label>
              <Input
                id="return-time"
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Expected Headcount</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="headcount-scouts">Scouts</Label>
                <Input
                  id="headcount-scouts"
                  type="number"
                  min={0}
                  value={scoutCount}
                  onChange={(e) => setScoutCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="headcount-adults">Adults</Label>
                <Input
                  id="headcount-adults"
                  type="number"
                  min={0}
                  value={adultCount}
                  onChange={(e) => setAdultCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="headcount-guests">Guests</Label>
                <Input
                  id="headcount-guests"
                  type="number"
                  min={0}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
            </div>
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="power-available"
                  checked={powerAvailable}
                  onCheckedChange={(checked) => setPowerAvailable(checked as boolean)}
                />
                <Label htmlFor="power-available" className="cursor-pointer font-normal">Power Available</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="running-water"
                  checked={runningWater}
                  onCheckedChange={(checked) => setRunningWater(checked as boolean)}
                />
                <Label htmlFor="running-water" className="cursor-pointer font-normal">Running Water</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trailer-access"
                  checked={trailerAccess}
                  onCheckedChange={(checked) => setTrailerAccess(checked as boolean)}
                />
                <Label htmlFor="trailer-access" className="cursor-pointer font-normal">Trailer Access</Label>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="expected-weather">Expected Weather</Label>
            <Input
              id="expected-weather"
              placeholder="e.g., Cool nights, chance of rain"
              value={expectedWeather}
              onChange={(e) => setExpectedWeather(e.target.value)}
            />
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
          <Button onClick={handleSubmit} disabled={!name || !dateRange?.from || !dateRange?.to || !troopId}>
            Create Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
