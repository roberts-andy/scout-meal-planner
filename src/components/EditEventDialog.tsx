import { useState, useEffect } from 'react'
import { Event } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  DialogH
} from '@/compon
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
 

      ...event,
      description: description || undefined,
      hike: hike || undefined,
      tentCamping: tentCamping || undefined,
      updatedAt: Date.now()

    onOpenChange(false)


  useEffect(() => {
          <DialogDescri
          </DialogDescription>
        <div className="grid 
    setHike(event.hike || false)
              id="edit-event-name"
              value={name}
            />
  }, [event])

              placeholder="Bri
              onChang

          <div className="grid ga
            <di
           
      description: description || undefined,
                />
      hike: hike || undefined,
                <Checkbox
      tentCamping: tentCamping || undefined,
                />
      updatedAt: Date.now()
     

    onUpdateEvent(updatedEvent)
              </div>
  }

  return (
              </div>
      <DialogContent className="sm:max-w-[500px]">
            <Label htm
              id="edit-event-link"
              placeholder="ht
              onChange={(e) => setLink(e.target.value)}
          </div>
        </DialogHeader>
            Cancel
          <div className="grid gap-2">
          </Button>
            <Input
  )




          </div>







              rows={3}

          </div>





                  id="edit-hike"







                  id="edit-high-altitude"





















            </div>

          <div className="grid gap-2">

            <Input

              type="url"

              value={link}

            />

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
