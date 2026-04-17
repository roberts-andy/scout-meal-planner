import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { troopsApi } from '@/lib/api'
import { Campfire, UsersThree } from '@phosphor-icons/react'

interface TroopOnboardingProps {
  onComplete: () => void
}

export function TroopOnboarding({ onComplete }: TroopOnboardingProps) {
  const [troopName, setTroopName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!troopName.trim()) return
    setError('')
    setLoading(true)
    try {
      await troopsApi.create(troopName.trim())
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create troop')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return
    setError('')
    setLoading(true)
    try {
      await troopsApi.join(inviteCode.trim().toUpperCase())
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join troop')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Scout Meal Planner</CardTitle>
          <CardDescription>
            Create a new troop or join an existing one to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">
                <Campfire className="mr-2 h-4 w-4" />
                Create Troop
              </TabsTrigger>
              <TabsTrigger value="join">
                <UsersThree className="mr-2 h-4 w-4" />
                Join Troop
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="troopName">Troop Name</Label>
                <Input
                  id="troopName"
                  placeholder="e.g., Troop 42"
                  value={troopName}
                  onChange={(e) => setTroopName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={loading || !troopName.trim()}>
                {loading ? 'Creating...' : 'Create Troop'}
              </Button>
              <p className="text-sm text-muted-foreground">
                You&rsquo;ll become the troop admin and get an invite code to share with others.
              </p>
            </TabsContent>

            <TabsContent value="join" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input
                  id="inviteCode"
                  placeholder="e.g., TROOP-A3X9"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
              </div>
              <Button className="w-full" onClick={handleJoin} disabled={loading || !inviteCode.trim()}>
                {loading ? 'Joining...' : 'Join Troop'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Ask your troop admin for the invite code. Your membership will be pending until approved.
              </p>
            </TabsContent>
          </Tabs>

          {error && (
            <p className="mt-4 text-center text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
