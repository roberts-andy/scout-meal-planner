import { useState } from 'react'
import { useFlaggedContent, useReviewContent } from '@/hooks/useModeration'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ShieldWarning, CheckCircle, XCircle, Eye, User } from '@phosphor-icons/react'
import { ModerationBadge } from '@/components/ModerationBadge'
import { format } from 'date-fns'
import type { FlaggedItem } from '@/lib/types'

const contentTypeLabels: Record<string, string> = {
  event: 'Event',
  recipe: 'Recipe',
  feedback: 'Feedback',
}

/**
 * Admin panel for reviewing flagged content.
 * Renders inside TroopAdmin and shows items that need moderation review.
 */
export function FlaggedContentReview() {
  const { data: flaggedItems, isLoading, isError } = useFlaggedContent()
  const reviewMutation = useReviewContent()
  const [selectedItem, setSelectedItem] = useState<FlaggedItem | null>(null)
  const [rejectConfirmItem, setRejectConfirmItem] = useState<FlaggedItem | null>(null)

  const items = flaggedItems || []

  function handleApprove(item: FlaggedItem) {
    reviewMutation.mutate({ id: item.id, action: 'approve' })
  }

  function handleReject(item: FlaggedItem) {
    reviewMutation.mutate(
      { id: item.id, action: 'reject' },
      { onSuccess: () => setRejectConfirmItem(null) }
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Loading flagged content…</p>
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-destructive">
            Failed to load flagged content. The moderation API may not be available yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldWarning size={20} className="text-destructive" />
            <CardTitle className="text-lg">
              Flagged Content
              {items.length > 0 && (
                <Badge variant="destructive" className="ml-2">{items.length}</Badge>
              )}
            </CardTitle>
          </div>
          <CardDescription>
            Content flagged by the moderation system for admin review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <CheckCircle size={40} className="text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No flagged content — everything looks good!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {contentTypeLabels[item.contentType] || item.contentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {item.contentName}
                    </TableCell>
                    <TableCell>
                      {item.submittedBy ? (
                        <span className="flex items-center gap-1 text-sm">
                          <User size={14} />
                          {item.submittedBy.displayName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(item.submittedAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <ModerationBadge status={item.moderationStatus} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                          title="Review details"
                        >
                          <Eye size={16} />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(item)}
                          disabled={reviewMutation.isPending}
                          title="Approve content"
                        >
                          <CheckCircle size={16} className="mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setRejectConfirmItem(item)}
                          disabled={reviewMutation.isPending}
                          title="Remove content"
                        >
                          <XCircle size={16} className="mr-1" />
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail review dialog */}
      <Dialog open={selectedItem !== null} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Flagged Content</DialogTitle>
            <DialogDescription>
              {selectedItem &&
                `${contentTypeLabels[selectedItem.contentType] || selectedItem.contentType}: ${selectedItem.contentName}`}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Moderation Status</p>
                <ModerationBadge status={selectedItem.moderationStatus} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Flagged Fields</p>
                <div className="flex flex-wrap gap-1">
                  {selectedItem.flaggedFields.map((field) => (
                    <Badge key={field} variant="outline">{field}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Reasons</p>
                <div className="rounded-md border p-3 space-y-1">
                  {Object.entries(selectedItem.reasons).map(([field, reason]) => (
                    <p key={field} className="text-sm">
                      <span className="font-medium">{field}:</span>{' '}
                      <span className="text-muted-foreground">{reason}</span>
                    </p>
                  ))}
                </div>
              </div>

              {selectedItem.submittedBy && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">Submitted By</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User size={14} />
                    {selectedItem.submittedBy.displayName}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-sm font-medium">Submitted</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedItem.submittedAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>
              Close
            </Button>
            {selectedItem && (
              <>
                <Button
                  onClick={() => {
                    handleApprove(selectedItem)
                    setSelectedItem(null)
                  }}
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle size={16} className="mr-1" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setRejectConfirmItem(selectedItem)
                    setSelectedItem(null)
                  }}
                  disabled={reviewMutation.isPending}
                >
                  <XCircle size={16} className="mr-1" />
                  Remove
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject confirmation */}
      <AlertDialog open={rejectConfirmItem !== null} onOpenChange={() => setRejectConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Flagged Content</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove &quot;{rejectConfirmItem?.contentName}&quot;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rejectConfirmItem && handleReject(rejectConfirmItem)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Content
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
