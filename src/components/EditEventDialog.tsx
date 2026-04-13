import { useState, useEffect } from 'react'
import { Event } from '@/lib/types'
  Dialog,
  Dialog
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

  useEffect(() => {
    setDescript
    setHike(event.hike || false)
    setTentCam
  }, [event])
 

      description: description || undefined,
      hike: hike || undefined,
      tentCamping: tentCamping || undefined,
      updatedAt: Date.now()
    onUpdateEvent(updatedEvent)
  }
  return (
      <DialogContent className="sm:max-w-[500px]">

            Update 
        </DialogHeader>
          <div className="grid gap-2">
            <Input
              placeholder="e.g.,
              onChange={(e) => setName(e.target.
          </div>
            <Label htmlFor="edit-event-descripti
             

              rows={3}
          </div>
            <La
           
                  id="edit-hike"
                  onCheckedCha
                <Label htmlFor
              <div className="flex items-cente
                  id="edit-high-altitude"
                  onCheckedChange={(checked) =
                <Label html
     
                  id="edit-tent
                  onChe
   

          
                  onCheckedChange={(checked) => setC
                <Label htmlFor="edit-cabin-camping
            </div>
          <div className="grid gap-2">
            <Input
              type="url"
              value={link}
            />
        </div>
          <Button variant="outline" on
          </Button>
            Save C
        </DialogFooter>
    </Dialog>
}




























































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
