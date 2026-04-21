import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { troopsApi } from '@/lib/api'

interface TroopOnboardingProps {
  onComplete: () => void
}

export function TroopOnboarding({ onComplete }: TroopOnboardingProps) {
  const search = typeof window !== 'undefined' ? window.location.search : ''
  const inviteCodeFromUrl = search
    ? new URLSearchParams(search).get('code')?.trim().toUpperCase() || ''
    : ''
  const [inviteCode, setInviteCode] = useState(inviteCodeFromUrl)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
            Join your troop to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
          </div>

          {error && (
            <p className="mt-4 text-center text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
