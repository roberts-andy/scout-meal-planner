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
      hike: hike || undefined,
      link: link || undefined,
      tentCamping: tentCamping || undefined,
      highAltitude: highAltitude || undefined,
      updatedAt: Date.now()
      cabinCamping: cabinCamping || undefined,

    }teEvent(updatedEvent)
    onOpenChange(false)
  }
    onOpenChange(false)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
    <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTitle>Edit Trip Details</DialogTitle>
        <DialogHeader>
          <DialogTitle>Edit Trip Details</DialogTitle>
          <DialogDescription>
            Update the details for your trip.
          </DialogDescription>
          <div className="grid gap-2">
        <div className="grid gap-4 py-4">el>
            <Input
            <Label htmlFor="edit-event-name">Trip Name</Label>
              value={name}
              id="edit-event-name"e(e.target.value)}
              value={name}"Weekend Camping Trip"
              onChange={(e) => setName(e.target.value)}
              placeholder="Weekend Camping Trip"
            />
          <div className="grid gap-2">
            <Label htmlFor="edit-event-description">Description</Label>
          <div className="grid gap-2">
            <Label htmlFor="edit-event-description">Description</Label>
            <Textareadescription}
              id="edit-event-description"tion(e.target.value)}
              value={description}description of the trip..."
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the trip..."
          </div>
            />
          <div className="grid gap-2">
            <Label htmlFor="edit-event-link">Link</Label>
          <div className="grid gap-2">
            <Label htmlFor="edit-event-link">Link</Label>
            <Input="url"
              id="edit-event-link"
              type="url"
              value={link}"https://example.com"
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://example.com"
            />
          </div>lassName="grid gap-3">
            <Label>Trip Type</Label>
          <div className="grid gap-3">col gap-2">
            <Label>Trip Type</Label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Checkbox={hike}
                  id="edit-hike"e={(checked) => setHike(checked as boolean)}
                  checked={hike}
                  onCheckedChange={(checked) => setHike(checked as boolean)}nter">
                />Hike
                <Label htmlFor="edit-hike" className="font-normal cursor-pointer">
                  Hike
                </Label>Name="flex items-center gap-2">
              </div>ckbox
              <div className="flex items-center gap-2">
                <Checkbox={highAltitude}
                  id="edit-high-altitude"ed) => setHighAltitude(checked as boolean)}
                  checked={highAltitude}
                  onCheckedChange={(checked) => setHighAltitude(checked as boolean)}inter">
                />High Altitude
                <Label htmlFor="edit-high-altitude" className="font-normal cursor-pointer">
                  High Altitude
                </Label>Name="flex items-center gap-2">
              </div>ckbox
              <div className="flex items-center gap-2">
                <Checkbox={tentCamping}
                  id="edit-tent-camping"ean)}
                  checked={tentCamping}
                  onCheckedChange={(checked) => setTentCamping(checked as boolean)}
                />Tent Camping
                <Label htmlFor="edit-tent-camping" className="font-normal cursor-pointer">
                  Tent Camping
                </Label>p-2">
              </div>ckbox
              <div className="flex items-center gap-2">
                <Checkbox={cabinCamping}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Save Changes
          <Button onClick={handleSubmit}>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
