import { useState, useEffect } from 'react'
import { setTokenProvider, setUnauthorizedHandler } from '@/lib/api'
import { useAuthContext } from '@/components/AuthProvider'
import { SignIn } from '@/components/SignIn'
import { TroopOnboarding } from '@/components/TroopOnboarding'
import { TroopAdmin } from '@/components/TroopAdmin'
import { EventList } from '@/components/EventList'
import { RecipeLibrary } from '@/components/RecipeLibrary'
import { EventDetail } from '@/components/EventDetail'
import { VersioningTest } from '@/components/VersioningTest'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, CookingPot, Flask, GearSix, SignOut } from '@phosphor-icons/react'
import { useAppData } from '@/hooks/useAppData'

export default function App() {
  const auth = useAuthContext()

  // Wire up the token provider so all API calls include the Bearer token
  useEffect(() => {
    if (auth.isAuthenticated) {
      setTokenProvider(auth.getAccessToken)
      setUnauthorizedHandler(() => auth.login())
      return () => {
        setUnauthorizedHandler(null)
      }
    }
    setUnauthorizedHandler(null)
  }, [auth.isAuthenticated, auth.getAccessToken, auth.login])

  // Not authenticated → show sign-in
  if (!auth.isAuthenticated) {
    if (auth.isLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Signing in...</p>
        </div>
      )
    }
    return <SignIn />
  }

  // Membership lookup failed (401/403/500/network). Render an actionable
  // screen rather than falling through to <AppContent /> where every query
  // would fail the same way and produce a generic "Failed to load data".
  if (auth.authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-destructive font-semibold">
            {auth.authError.status === 401 || auth.authError.status === 403
              ? 'We could not verify your access.'
              : 'We could not load your troop membership.'}
          </p>
          <p className="text-muted-foreground text-sm">
            {auth.authError.message}
            {auth.authError.status != null && ` (HTTP ${auth.authError.status})`}
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button variant="default" size="sm" onClick={auth.retryMembership}>
              Retry
            </Button>
            <Button variant="ghost" size="sm" onClick={auth.logout}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated but no troop → onboarding
  if (auth.needsOnboarding) {
    return <TroopOnboarding onComplete={() => window.location.reload()} />
  }

  // Still loading membership
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return <AppContent />
}

function AppContent() {
  const { role, user, logout } = useAuthContext()
  const {
    events,
    recipes,
    feedback,
    selectedEvent,
    setSelectedEventId,
    isLoading,
    queryError,
    failedResources,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleCreateRecipe,
    handleUpdateRecipe,
    handleDeleteRecipe,
    handleAddFeedback,
    handleUpdateFeedback,
    handleDeleteFeedback,
  } = useAppData()

  const [activeTab, setActiveTab] = useState<'events' | 'recipes' | 'test' | 'admin'>('events')

  if (queryError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <p className="text-destructive font-semibold">Failed to load {failedResources || 'data'}</p>
          <p className="text-muted-foreground text-sm">{queryError.message}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        recipes={recipes}
        feedback={feedback}
        onUpdateEvent={handleUpdateEvent}
        onBack={() => setSelectedEventId(null)}
        onAddFeedback={handleAddFeedback}
        onUpdateFeedback={handleUpdateFeedback}
        onDeleteFeedback={handleDeleteFeedback}
        onUpdateRecipe={handleUpdateRecipe}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary tracking-tight">Scout Meal Planner</h1>
            <p className="text-muted-foreground mt-1">Plan events, manage recipes, and organize meals</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.displayName}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <SignOut className="mr-1 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className={`grid w-full max-w-2xl mb-8 ${role === 'troopAdmin' ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar size={18} />
              Events
            </TabsTrigger>
            <TabsTrigger value="recipes" className="flex items-center gap-2">
              <CookingPot size={18} />
              Recipes
            </TabsTrigger>
            <TabsTrigger value="test" className="flex items-center gap-2">
              <Flask size={18} />
              Test Versioning
            </TabsTrigger>
            {role === 'troopAdmin' && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <GearSix size={18} />
                Troop Admin
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="events" className="mt-0">
            <EventList
              events={events}
              onSelectEvent={setSelectedEventId}
              onCreateEvent={handleCreateEvent}
              onDeleteEvent={handleDeleteEvent}
            />
          </TabsContent>

          <TabsContent value="recipes" className="mt-0">
            <RecipeLibrary
              recipes={recipes}
              feedback={feedback}
              onCreateRecipe={handleCreateRecipe}
              onUpdateRecipe={handleUpdateRecipe}
              onDeleteRecipe={handleDeleteRecipe}
            />
          </TabsContent>

          <TabsContent value="test" className="mt-0">
            <VersioningTest
              events={events}
              recipes={recipes}
              onUpdateRecipe={handleUpdateRecipe}
            />
          </TabsContent>

          {role === 'troopAdmin' && (
            <TabsContent value="admin" className="mt-0">
              <TroopAdmin />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  )
}
