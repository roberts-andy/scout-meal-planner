import { useState, useEffect } from 'react'
import { Event } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  DialogC
  DialogFooter,
  DialogTitle,
import { Input 
import { Textar

  open: boolean
  event: Event
}
export function EditEventDialog({ open, onOpenChang
  const [description, setDescription] = useState(ev

interface EditEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event
  onUpdateEvent: (event: Event) => void
}

export function EditEventDialog({ open, onOpenChange, event, onUpdateEvent }: EditEventDialogProps) {
  const [name, setName] = useState(event.name)
  const [description, setDescription] = useState(event.description || '')
  const [link, setLink] = useState(event.link || '')
  const [hike, setHike] = useState(event.hike || false)
  const [highAltitude, setHighAltitude] = useState(event.highAltitude || false)
  const [tentCamping, setTentCamping] = useState(event.tentCamping || false)
  const [cabinCamping, setCabinCamping] = useState(event.cabinCamping || false)

    const updatedEv
      name,
      link: link || undefined,
      highAltitude: highAltit
      cabinCamping: cabinCamping
    }
    onUpdateEvent(updatedEvent)
  }
  return (

          <DialogTitle>Edit Ev
            Update ev

          <div className="grid ga
            <In
           
              onChange={(e) => setName(e.tar
          </div>
            <Label htmlFor="ed
              id="edit-event-description"
              value={description}
              rows={3}
          </div>
     

                  id="edit-hike
                  onChe
   

          
                  onCheckedChange={(checked) => setH
                <Label htmlFor="edit-high-altitude
        <DialogHeader>
          <DialogTitle>Edit Event Details</DialogTitle>
          <DialogDescription>
            Update event information. Note: Dates cannot be changed once the event is created.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-event-name">Event Name</Label>
            <Input
              id="edit-event-name"
              placeholder="e.g., Summer Camp 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-event-description">Description</Label>
            <Textarea
              id="edit-event-description"
              placeholder="Brief description of the trip..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label>Event Characteristics</Label>
            <div className="grid gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-hike"
                  checked={hike}
                  onCheckedChange={(checked) => setHike(checked as boolean)}
                />
                <Label htmlFor="edit-hike" className="cursor-pointer font-normal">Hike</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-high-altitude"
                  checked={highAltitude}
                  onCheckedChange={(checked) => setHighAltitude(checked as boolean)}
                />
                <Label htmlFor="edit-high-altitude" className="cursor-pointer font-normal">High Altitude</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-tent-camping"
                  checked={tentCamping}
                  onCheckedChange={(checked) => setTentCamping(checked as boolean)}
                />
                <Label htmlFor="edit-tent-camping" className="cursor-pointer font-normal">Tent Camping</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-cabin-camping"
                  checked={cabinCamping}
                  onCheckedChange={(checked) => setCabinCamping(checked as boolean)}
                />
                <Label htmlFor="edit-cabin-camping" className="cursor-pointer font-normal">Cabin Camping</Label>
              </div>
            </div>
          </div>
          <div className="grid gap-2">






















