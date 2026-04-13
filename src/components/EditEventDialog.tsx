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

interface EditEventDialogProps {
  event: Event
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateEvent: (event: Event) => void
}

export function EditEventDialog({
  event,
  open,
  onOpenChange,
  onUpdateEvent,
}: EditEventDialogProps) {
  const [name, setName] = useState(event.name)
  const [description, setDescription] = useState(event.description || '')
  const [link, setLink] = useState(event.link || '')
  const [hike, setHike] = useState(event.hike || false)
  const [highAltitude, setHighAltitude] = useState(event.highAltitude || false)
  const [tentCamping, setTentCamping] = useState(event.tentCamping || false)
  const [cabinCamping, setCabinCamping] = useState(event.cabinCamping || false)

  useEffect(() => {
    setName(event.name)
    setDescription(event.description || '')
    setLink(event.link || '')
    setHike(event.hike || false)
    setHighAltitude(event.highAltitude || false)
    setTentCamping(event.tentCamping || false)
    setCabinCamping(event.cabinCamping || false)
  }, [event])

  const handleSubmit = () => {
    const updatedEvent: Event = {
      ...event,
      name,
      description: description || undefined,
      link: link || undefined,
      hike: hike || undefined,
      highAltitude: highAltitude || undefined,
      tentCamping: tentCamping || undefined,
      cabinCamping: cabinCamping || undefined,
      updatedAt: Date.now()
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
              rows={3}
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

          <div className="grid gap-3">
            <Label>Trip Type</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-hike"
                  checked={hike}
                  onCheckedChange={(checked) => setHike(checked as boolean)}
                />
                <Label htmlFor="edit-hike" className="font-normal cursor-pointer">
                  Hike
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-high-altitude"
                  checked={highAltitude}
                  onCheckedChange={(checked) => setHighAltitude(checked as boolean)}
                />
                <Label htmlFor="edit-high-altitude" className="font-normal cursor-pointer">
                  High Altitude
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-tent-camping"
                  checked={tentCamping}
                  onCheckedChange={(checked) => setTentCamping(checked as boolean)}
                />
                <Label htmlFor="edit-tent-camping" className="font-normal cursor-pointer">
                  Tent Camping
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-cabin-camping"
                  checked={cabinCamping}
                  onCheckedChange={(checked) => setCabinCamping(checked as boolean)}
                />
                <Label htmlFor="edit-cabin-camping" className="font-normal cursor-pointer">
                  Cabin Camping
                </Label>
              </div>
            </div>
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
