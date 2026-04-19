import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, membersApi, troopsApi } from '@/lib/api'
import { useAuthContext } from './AuthProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Copy, UserCircleMinus, CheckCircle } from '@phosphor-icons/react'
import type { FlaggedContentAction, FlaggedContentItem, MemberStatus, TroopMember, TroopRole } from '@/lib/types'

const roleLabels: Record<TroopRole, string> = {
  troopAdmin: 'Troop Admin',
  adultLeader: 'Adult Leader',
  seniorPatrolLeader: 'Sr. Patrol Leader',
  patrolLeader: 'Patrol Leader',
  scout: 'Scout',
}

const memberStatusLabels: Record<MemberStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  deactivated: 'Deactivated',
  removed: 'Removed',
}

const allRoles: TroopRole[] = ['troopAdmin', 'adultLeader', 'seniorPatrolLeader', 'patrolLeader', 'scout']
const DEFAULT_MEMBER_FORM: { displayName: string; email: string; role: TroopRole } = {
  displayName: '',
  email: '',
  role: 'scout',
}

export function TroopAdmin() {
  const { user, role } = useAuthContext()
  const queryClient = useQueryClient()
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [addMemberError, setAddMemberError] = useState('')
  const [memberForm, setMemberForm] = useState<{ displayName: string; email: string; role: TroopRole }>(DEFAULT_MEMBER_FORM)
  const [editDrafts, setEditDrafts] = useState<Record<string, string>>({})
  const [editingIds, setEditingIds] = useState<Record<string, boolean>>({})

  const troopQuery = useQuery({ queryKey: ['troop'], queryFn: troopsApi.get })
  const membersQuery = useQuery({ queryKey: ['members'], queryFn: membersApi.getAll })
  const flaggedContentQuery = useQuery({ queryKey: ['adminFlaggedContent'], queryFn: adminApi.getFlaggedContent })

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => membersApi.updateRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })

  const approveMember = useMutation({
    mutationFn: (id: string) => membersApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })

  const removeMember = useMutation({
    mutationFn: (id: string) => membersApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['members'] }),
  })

  const deleteMemberData = useMutation({
    mutationFn: (id: string) => membersApi.deleteData(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['feedback'] })
    },
  })

  const createMember = useMutation({
    mutationFn: (member: { displayName: string; email: string; role: string }) => membersApi.create(member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setIsAddMemberDialogOpen(false)
      setAddMemberError('')
      setMemberForm(DEFAULT_MEMBER_FORM)
    },
  })

  const reviewFlaggedContent = useMutation({
    mutationFn: ({ id, action, edits }: { id: string; action: FlaggedContentAction; edits?: Record<string, string> }) =>
      adminApi.reviewFlaggedContent(id, { action, edits }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFlaggedContent'] })
    },
  })

  if (role !== 'troopAdmin') {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Only troop admins can access this page.
      </div>
    )
  }

  const troop = troopQuery.data
  const members = (membersQuery.data || []) as TroopMember[]
  const pendingMembers = members.filter((m) => m.status === 'pending')
  const nonPendingMembers = members.filter((m) => m.status !== 'pending')
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const inviteLink = appOrigin && troop?.inviteCode
    ? `${appOrigin}/join?code=${encodeURIComponent(troop.inviteCode)}`
    : ''

  function copyInviteCode() {
    if (troop?.inviteCode && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(troop.inviteCode).catch(() => {
        console.warn('Failed to copy invite code to clipboard')
      })
    }
  }

  function copyInviteLink() {
    if (inviteLink && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(inviteLink).catch(() => {
        console.warn('Failed to copy invite link to clipboard')
      })
    }
  }

  async function handleAddMember() {
    setAddMemberError('')
    try {
      await createMember.mutateAsync({
        displayName: memberForm.displayName.trim(),
        email: memberForm.email.trim(),
        role: memberForm.role,
      })
    } catch (err) {
      setAddMemberError(err instanceof Error ? err.message : 'An unexpected error occurred while adding member')
    }
  }

  function handleDeleteMemberData(member: TroopMember) {
    const confirmed = window.confirm(`Delete all data for ${member.displayName}? This cannot be undone.`)
    if (!confirmed) return
    deleteMemberData.mutate(member.id)
  }

  function getDefaultEditText(item: FlaggedContentItem): string {
    return item.contentType === 'recipe'
      ? (item.context.name || '')
      : (item.context.comments || '')
  }

  async function handleEditReview(item: FlaggedContentItem) {
    const draft = (editDrafts[item.id] ?? '').trim()
    if (!draft) return
    const edits = item.contentType === 'recipe'
      ? { name: draft }
      : { comments: draft }
    await reviewFlaggedContent.mutateAsync({ id: item.id, action: 'edit', edits })
    setEditingIds((prev) => ({ ...prev, [item.id]: false }))
  }

  return (
    <div className="space-y-6 p-4">
      {/* Troop Info */}
      <Card>
        <CardHeader>
          <CardTitle>{troop?.name || 'Loading...'}</CardTitle>
          <CardDescription>Troop administration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Invite Code:</span>
              <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                {troop?.inviteCode || '...'}
              </code>
              <Button variant="ghost" size="icon" onClick={copyInviteCode} title="Copy invite code">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Invite Link:</span>
              <code className="rounded bg-muted px-2 py-1 text-sm font-mono break-all">
                {inviteLink || '...'}
              </code>
              <Button variant="ghost" size="icon" onClick={copyInviteLink} title="Copy invite link">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button">Add Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                  <DialogDescription>
                    Add a member directly to your troop.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={memberForm.displayName}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, displayName: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={memberForm.email}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={memberForm.role}
                      onValueChange={(value: TroopRole) => setMemberForm((prev) => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabels[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {addMemberError && (
                    <p className="text-sm text-destructive">{addMemberError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddMemberDialogOpen(false)}
                    disabled={createMember.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleAddMember}
                    disabled={
                      createMember.isPending
                      || !memberForm.displayName.trim()
                      || !memberForm.email.trim()
                    }
                  >
                    {createMember.isPending ? 'Adding...' : 'Add Member'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Share this code or invite link with troop members so they can join.
          </p>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      {pendingMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Approvals ({pendingMembers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.displayName}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approveMember.mutate(member.id)}
                          disabled={approveMember.isPending}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeMember.mutate(member.id)}
                          disabled={removeMember.isPending}
                        >
                          Decline
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Active Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Members ({nonPendingMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nonPendingMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    {member.displayName}
                    {member.userId === user?.userId && (
                      <Badge variant="secondary" className="ml-2">You</Badge>
                    )}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Select
                      value={member.role}
                      onValueChange={(newRole) => updateRole.mutate({ id: member.id, role: newRole })}
                      disabled={member.userId === user?.userId}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabels[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                      {memberStatusLabels[member.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.userId !== user?.userId && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteMemberData(member)}
                          disabled={deleteMemberData.isPending}
                        >
                          Delete All Data
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeMember.mutate(member.id)}
                          disabled={removeMember.isPending}
                        >
                          <UserCircleMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Flagged Content Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Flagged Content Review</CardTitle>
          <CardDescription>Review content flagged by moderation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(flaggedContentQuery.data || []).length === 0 && (
            <p className="text-sm text-muted-foreground">No flagged content to review.</p>
          )}

          {(flaggedContentQuery.data || []).map((item) => (
            <div key={item.id} className="rounded-md border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {item.contentType === 'recipe' ? `Recipe: ${item.context.name || item.contentId}` : `Feedback: ${item.contentId}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.flagReason}</p>
                  <p className="text-xs text-muted-foreground">
                    Flagged {new Date(item.flaggedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => reviewFlaggedContent.mutate({ id: item.id, action: 'approve' })}
                    disabled={reviewFlaggedContent.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => reviewFlaggedContent.mutate({ id: item.id, action: 'reject' })}
                    disabled={reviewFlaggedContent.isPending}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                      setEditDrafts((prev) => ({ ...prev, [item.id]: prev[item.id] ?? getDefaultEditText(item) }))
                    }}
                    disabled={reviewFlaggedContent.isPending}
                  >
                    Edit
                  </Button>
                </div>
              </div>

              {editingIds[item.id] && (
                <div className="flex gap-2">
                  <Input
                    aria-label={`Edit flagged content ${item.id}`}
                    value={editDrafts[item.id] ?? ''}
                    onChange={(e) => setEditDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    onClick={() => void handleEditReview(item)}
                    disabled={reviewFlaggedContent.isPending || !(editDrafts[item.id] ?? '').trim()}
                  >
                    Save Edit
                  </Button>
                </div>
              )}

              {item.contentType === 'feedback' && (
                <p className="text-sm">
                  <span className="font-medium">Comment:</span> {item.context.comments || '—'}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
