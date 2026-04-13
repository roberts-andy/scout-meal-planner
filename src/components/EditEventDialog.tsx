import { useState, useEffect } from 'react'
import { Button } from '@/component
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from '@/compo
  DialogHeader,
import { Texta
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

  const [cabinCamping, setCabinC
  useEffect(() 
    setDescription(event.description ||
    setHike(ev
    setTentCamping(event.tentCamping ||
 

      ...event,
      description: description || undefined,
      hike,
      tentCamping,
    }
    onOpenChange(false)

    <Dialog open={open} onOpenChange={onOpenChange}>

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
          <
      description: description || undefined,
              id="edit-event-d
      hike,
      highAltitude,
      tentCamping,
      cabinCamping,
     
              id="edit-event-li
    onOpenChange(false)
   

          
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <div cla
                  id="edit-cabin-camping"
                  onCheckedCh
                <Label htmlFor="edit-cabin-camping" className="cursor-pointer font-normal">Cab
            </div>
        </div>
          <Button variant="outline" onCli
          </Button>
            Save Changes
        </DialogFo
    </Dialog>
}















            <Label htmlFor="edit-event-link">Event Link</Label>
            <Input
              id="edit-event-link"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
          <div className="grid gap-2">




































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
