import { useState, useEffect } from 'react'
import { Event } from '@/lib/types'
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
import { TagInput } from './TagInput'

interface EditEventDialogProps {
  event: Event
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateEvent: (event: Event) => void
  existingTags?: string[]
}

export function EditEventDialog({
  event,
  open,
  onOpenChange,
  onUpdateEvent,
  existingTags = [],
}: EditEventDialogProps) {
  const [name, setName] = useState(event.name)
  const [description, setDescription] = useState(event.description || '')
  const [link, setLink] = useState(event.link || '')
  const [departureTime, setDepartureTime] = useState(event.departureTime || '')
  const [returnTime, setReturnTime] = useState(event.returnTime || '')
  const [scoutCount, setScoutCount] = useState(event.headcount?.scoutCount ?? 0)
  const [adultCount, setAdultCount] = useState(event.headcount?.adultCount ?? 0)
  const [guestCount, setGuestCount] = useState(event.headcount?.guestCount ?? 0)
  const [tags, setTags] = useState(event.tags || [])
  const [powerAvailable, setPowerAvailable] = useState(event.powerAvailable || false)
  const [runningWater, setRunningWater] = useState(event.runningWater || false)
  const [trailerAccess, setTrailerAccess] = useState(event.trailerAccess || false)
  const [expectedWeather, setExpectedWeather] = useState(event.expectedWeather || '')

  useEffect(() => {
    setName(event.name)
    setDescription(event.description || '')
    setLink(event.link || '')
    setDepartureTime(event.departureTime || '')
    setReturnTime(event.returnTime || '')
    setScoutCount(event.headcount?.scoutCount ?? 0)
    setAdultCount(event.headcount?.adultCount ?? 0)
    setGuestCount(event.headcount?.guestCount ?? 0)
    setTags(event.tags || [])
    setPowerAvailable(event.powerAvailable || false)
    setRunningWater(event.runningWater || false)
    setTrailerAccess(event.trailerAccess || false)
    setExpectedWeather(event.expectedWeather || '')
  }, [event])

  const handleSubmit = () => {
    const updatedEvent: Event = {
      ...event,
      name,
      description,
      departureTime: departureTime || undefined,
      returnTime: returnTime || undefined,
      headcount: {
        scoutCount,
        adultCount,
        guestCount,
      },
      tags: tags.length > 0 ? tags : undefined,
      link: link || undefined,
      updatedAt: Date.now(),
      powerAvailable: powerAvailable || undefined,
      runningWater: runningWater || undefined,
      trailerAccess: trailerAccess || undefined,
      expectedWeather: expectedWeather.trim() || undefined,
    }
    onUpdateEvent(updatedEvent)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Trip Details</DialogTitle>
          <DialogDescription>
            Update the details for your trip.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-event-name">Trip Name</Label>
            <Input
              id="edit-event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekend Camping Trip"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-event-description">Description</Label>
            <Textarea
              id="edit-event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the trip..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-event-link">Link</Label>
            <Input
              id="edit-event-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-departure-time">Departure Time</Label>
              <Input
                id="edit-departure-time"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-return-time">Return Time</Label>
              <Input
                id="edit-return-time"
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
                <Label htmlFor="edit-headcount-scouts">Scouts</Label>
                <Input
                  id="edit-headcount-scouts"
                  type="number"
                  min={0}
                  value={scoutCount}
                  onChange={(e) => setScoutCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-headcount-adults">Adults</Label>
                <Input
                  id="edit-headcount-adults"
                  type="number"
                  min={0}
                  value={adultCount}
                  onChange={(e) => setAdultCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-headcount-guests">Guests</Label>
                <Input
                  id="edit-headcount-guests"
                  type="number"
                  min={0}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                />
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            <Label>Trip Type</Label>
            <div className="flex flex-col gap-2">
              <TagInput
                tags={tags}
                suggestions={existingTags}
                onChange={setTags}
                placeholder="e.g., Hike, Canoeing, High Altitude"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-power-available"
                  checked={powerAvailable}
                  onCheckedChange={(checked) => setPowerAvailable(checked as boolean)}
                />
                <Label htmlFor="edit-power-available" className="font-normal cursor-pointer">
                  Power Available
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-running-water"
                  checked={runningWater}
                  onCheckedChange={(checked) => setRunningWater(checked as boolean)}
                />
                <Label htmlFor="edit-running-water" className="font-normal cursor-pointer">
                  Running Water
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-trailer-access"
                  checked={trailerAccess}
                  onCheckedChange={(checked) => setTrailerAccess(checked as boolean)}
                />
                <Label htmlFor="edit-trailer-access" className="font-normal cursor-pointer">
                  Trailer Access
                </Label>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-expected-weather">Expected Weather</Label>
            <Input
              id="edit-expected-weather"
              value={expectedWeather}
              onChange={(e) => setExpectedWeather(e.target.value)}
              placeholder="e.g., Cool nights, chance of rain"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
