import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { membersApi, troopsApi } from '@/lib/api'
import { useAuthContext } from './AuthProvider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Copy, UserCircleMinus, CheckCircle } from '@phosphor-icons/react'
import type { TroopMember, TroopRole } from '@/lib/types'

const roleLabels: Record<TroopRole, string> = {
  troopAdmin: 'Troop Admin',
  adultLeader: 'Adult Leader',
  seniorPatrolLeader: 'Sr. Patrol Leader',
  patrolLeader: 'Patrol Leader',
  scout: 'Scout',
}

const allRoles: TroopRole[] = ['troopAdmin', 'adultLeader', 'seniorPatrolLeader', 'patrolLeader', 'scout']

export function TroopAdmin() {
  const { user, role } = useAuthContext()
  const queryClient = useQueryClient()

  const troopQuery = useQuery({ queryKey: ['troop'], queryFn: troopsApi.get })
  const membersQuery = useQuery({ queryKey: ['members'], queryFn: membersApi.getAll })

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
  const activeMembers = members.filter((m) => m.status === 'active')

  function copyInviteCode() {
    if (troop?.inviteCode) {
      navigator.clipboard.writeText(troop.inviteCode)
    }
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
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Invite Code:</span>
            <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
              {troop?.inviteCode || '...'}
            </code>
            <Button variant="ghost" size="icon" onClick={copyInviteCode} title="Copy invite code">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Share this code with troop members so they can join.
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
          <CardTitle className="text-lg">Members ({activeMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeMembers.map((member) => (
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
                    {member.userId !== user?.userId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMember.mutate(member.id)}
                        disabled={removeMember.isPending}
                      >
                        <UserCircleMinus className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
