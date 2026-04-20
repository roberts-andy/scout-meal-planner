import { useEffect, useState } from 'react'
import { Event, Recipe, MealFeedback } from '@/lib/types'
import { eventsApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Link as LinkIcon, PencilSimple, Copy, ArrowsClockwise, XCircle } from '@phosphor-icons/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EventSchedule } from './EventSchedule'
import { EventShoppingList } from './EventShoppingList'
import { EventEquipment } from './EventEquipment'
import { EventFeedback } from './EventFeedback'
import { EditEventDialog } from './EditEventDialog'
import { toast } from 'sonner'
import { canSubmitEventFeedback } from '@/lib/helpers'

interface EventDetailProps {
  event: Event
  recipes: Recipe[]
  feedback: MealFeedback[]
  onUpdateEvent: (event: Event) => void
  onBack: () => void
  onAddFeedback: (feedback: MealFeedback) => void
  onUpdateFeedback: (feedback: MealFeedback) => void
  onDeleteFeedback: (feedbackId: string) => void
  onUpdateRecipe: (recipe: Recipe) => void
}

export function EventDetail({
  event,
  recipes,
  feedback,
  onUpdateEvent,
  onBack,
  onAddFeedback,
  onUpdateFeedback,
  onDeleteFeedback,
  onUpdateRecipe
}: EventDetailProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const feedbackEnabled = canSubmitEventFeedback(event)
  const headcount = event.headcount ?? { scoutCount: 0, adultCount: 0, guestCount: 0 }

  const buildShareUrl = (token?: string) => token ? `${window.location.origin}/share/${token}` : null

  useEffect(() => {
    let cancelled = false
    eventsApi.getShare(event.id)
      .then((share) => {
        if (!cancelled) {
          setShareUrl(share.shareUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShareUrl(buildShareUrl(event.shareToken))
        }
      })
    return () => {
      cancelled = true
    }
  }, [event.id, event.shareToken])

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      return false
    }
  }

  const handleCopyShareLink = async () => {
    setIsSharing(true)
    try {
      const current = await eventsApi.getShare(event.id)
      const next = current.shareUrl
        ? { shareUrl: current.shareUrl }
        : await eventsApi.regenerateShare(event.id)
      setShareUrl(next.shareUrl)
      const copied = await copyToClipboard(next.shareUrl)
      if (copied) {
        toast.success('Share link copied')
      } else {
        toast.success('Share link generated', { description: next.shareUrl })
      }
    } catch (err) {
      toast.error('Failed to create share link', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleRegenerate = async () => {
    setIsSharing(true)
    try {
      const next = await eventsApi.regenerateShare(event.id)
      setShareUrl(next.shareUrl)
      await copyToClipboard(next.shareUrl)
      toast.success('Share link regenerated and copied')
    } catch (err) {
      toast.error('Failed to regenerate share link', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleRevoke = async () => {
    setIsSharing(true)
    try {
      await eventsApi.revokeShare(event.id)
      setShareUrl(null)
      toast.success('Share link revoked')
    } catch (err) {
      toast.error('Failed to revoke share link', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={onBack}
            >
              <ArrowLeft size={20} />
              Back to Events
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setEditDialogOpen(true)}
            >
              <PencilSimple size={16} />
              Edit Details
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-primary tracking-tight">{event.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <p className="text-muted-foreground">
              {event.days.length} days • {event.days.reduce((acc, day) => acc + day.meals.length, 0)} meals planned
            </p>
            {(event.hike || event.highAltitude || event.tentCamping || event.cabinCamping || event.powerAvailable || event.runningWater || event.trailerAccess || event.expectedWeather) && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex flex-wrap gap-1.5">
                  {event.hike && <Badge variant="secondary" className="text-xs">Hike</Badge>}
                  {event.highAltitude && <Badge variant="secondary" className="text-xs">High Altitude</Badge>}
                  {event.tentCamping && <Badge variant="secondary" className="text-xs">Tent Camping</Badge>}
                  {event.cabinCamping && <Badge variant="secondary" className="text-xs">Cabin Camping</Badge>}
                  {event.powerAvailable && <Badge variant="secondary" className="text-xs">Power Available</Badge>}
                  {event.runningWater && <Badge variant="secondary" className="text-xs">Running Water</Badge>}
                  {event.trailerAccess && <Badge variant="secondary" className="text-xs">Trailer Access</Badge>}
                  {event.expectedWeather && <Badge variant="outline" className="text-xs">Weather: {event.expectedWeather}</Badge>}
                </div>
              </>
            )}
          </div>
          {event.description && (
            <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{event.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-2">
            <span>Departure: {event.departureTime || 'Not set'}</span>
            <span>•</span>
            <span>Return: {event.returnTime || 'Not set'}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Headcount: {headcount.scoutCount} scouts, {headcount.adultCount} adults, {headcount.guestCount} guests
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyShareLink} disabled={isSharing}>
              <Copy size={16} />
              {shareUrl ? 'Copy Share Link' : 'Create Share Link'}
            </Button>
            {shareUrl && (
              <>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleRegenerate} disabled={isSharing}>
                  <ArrowsClockwise size={16} />
                  Regenerate
                </Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={handleRevoke} disabled={isSharing}>
                  <XCircle size={16} />
                  Revoke
                </Button>
              </>
            )}
          </div>
          {event.link && (
            <a 
              href={event.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
            >
              <LinkIcon size={16} />
              Event Link
            </a>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-8">
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="shopping">Shopping List</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="feedback" disabled={!feedbackEnabled}>Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="mt-0">
            <EventSchedule
              event={event}
              recipes={recipes}
              onUpdateEvent={onUpdateEvent}
              onUpdateRecipe={onUpdateRecipe}
            />
          </TabsContent>

          <TabsContent value="shopping" className="mt-0">
            <EventShoppingList
              event={event}
              recipes={recipes}
            />
          </TabsContent>

          <TabsContent value="equipment" className="mt-0">
            <EventEquipment
              event={event}
              recipes={recipes}
            />
          </TabsContent>

          <TabsContent value="feedback" className="mt-0">
            <EventFeedback
              event={event}
              recipes={recipes}
              feedback={feedback}
              onAddFeedback={onAddFeedback}
              onUpdateFeedback={onUpdateFeedback}
              onDeleteFeedback={onDeleteFeedback}
            />
          </TabsContent>
        </Tabs>
      </main>

      <EditEventDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        event={event}
        onUpdateEvent={onUpdateEvent}
      />
    </div>
  )
}
