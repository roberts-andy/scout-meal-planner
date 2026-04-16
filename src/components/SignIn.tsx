import { useAuthContext } from './AuthProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Campfire } from '@phosphor-icons/react'

export function SignIn() {
  const { login } = useAuthContext()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Campfire className="h-8 w-8 text-primary" weight="duotone" />
          </div>
          <CardTitle className="text-2xl">Scout Meal Planner</CardTitle>
          <CardDescription>
            Plan meals for your troop&rsquo;s camping trips and events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" size="lg" onClick={login}>
            Sign in
          </Button>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Sign in with your email to get started. After signing in you can
            create a new troop or join an existing one with an invite code.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
