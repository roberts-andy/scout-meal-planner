import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, Flask, Tent, ClockCounterClockwise, Play } from '@phosphor-icons/react'
import { Event, Recipe } from '@/lib/types'
import { isEventActive } from '@/lib/helpers'

interface TestResult {
  name: string
  passed: boolean
  details: string
  category?: 'setup' | 'versioning' | 'integrity' | 'detail'
}

interface VersioningTestProps {
  events: Event[]
  recipes: Recipe[]
  onUpdateRecipe: (recipe: Recipe) => void
}

export function VersioningTest({ events, recipes, onUpdateRecipe }: VersioningTestProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runTests = () => {
    setIsRunning(true)
    const results: TestResult[] = []

    const baseRecipe = recipes.find(r => !r.clonedFrom)
    
    if (!baseRecipe) {
      results.push({
        name: 'Find Base Recipe',
        passed: false,
        details: 'No base recipe found. Please create a recipe first.',
        category: 'setup',
      })
      setTestResults(results)
      setIsRunning(false)
      return
    }

    results.push({
      name: 'Find Base Recipe',
      passed: true,
      details: `Found recipe: "${baseRecipe.name}"`,
      category: 'setup',
    })

    const activeEvents = events.filter(isEventActive)
    
    if (activeEvents.length < 2) {
      results.push({
        name: 'Find Multiple Active Events',
        passed: false,
        details: `Found ${activeEvents.length} active events. Need at least 2 active events to test independent versioning.`,
        category: 'setup',
      })
      setTestResults(results)
      setIsRunning(false)
      return
    }

    results.push({
      name: 'Find Multiple Active Events',
      passed: true,
      details: `Found ${activeEvents.length} active events: ${activeEvents.map(e => `"${e.name}"`).join(', ')}`,
      category: 'setup',
    })

    const eventVersions = baseRecipe.versions.filter(v => v.eventId)
    const uniqueEventIds = new Set(eventVersions.map(v => v.eventId))

    results.push({
      name: 'Check Version Count',
      passed: eventVersions.length > 0,
      details: `Recipe has ${eventVersions.length} event-specific version(s) across ${uniqueEventIds.size} unique event(s)`,
      category: 'versioning',
    })

    if (uniqueEventIds.size >= 2) {
      results.push({
        name: 'Independent Versioning Across Trips',
        passed: true,
        details: `✓ Recipe has been edited on ${uniqueEventIds.size} different trips with independent versions`,
        category: 'versioning',
      })

      const versionsByEvent = new Map<string, number>()
      eventVersions.forEach(v => {
        if (v.eventId) {
          versionsByEvent.set(v.eventId, (versionsByEvent.get(v.eventId) || 0) + 1)
        }
      })

      let independentVersionsPassed = true
      const problemEvents: string[] = []
      versionsByEvent.forEach((count, eventId) => {
        if (count > 1) {
          independentVersionsPassed = false
          const event = events.find(e => e.id === eventId)
          if (event) problemEvents.push(`"${event.name}" (${count} versions)`)
        }
      })

      results.push({
        name: 'One Version Per Event',
        passed: independentVersionsPassed,
        details: independentVersionsPassed 
          ? '✓ Each event has exactly one version (multiple edits on one trip = one version)'
          : `✗ Some events have multiple versions: ${problemEvents.join(', ')}`,
        category: 'versioning',
      })
    } else {
      results.push({
        name: 'Independent Versioning Across Trips',
        passed: false,
        details: `Recipe needs to be edited on at least 2 different trips. Currently edited on ${uniqueEventIds.size} trip(s).`,
        category: 'versioning',
      })
    }

    const currentVersionNumber = baseRecipe.currentVersion
    const expectedVersionNumber = 1 + uniqueEventIds.size

    results.push({
      name: 'Version Number Integrity',
      passed: currentVersionNumber === expectedVersionNumber,
      details: `Current version: ${currentVersionNumber}, Expected: ${expectedVersionNumber} (1 base + ${uniqueEventIds.size} event versions)`,
      category: 'integrity',
    })

    const versionNumbers = new Set(baseRecipe.versions.map(v => v.versionNumber))
    versionNumbers.add(1)
    const hasSequentialVersions = versionNumbers.size === currentVersionNumber
    const sortedVersions = Array.from(versionNumbers).sort((a, b) => a - b)
    const isSequential = sortedVersions.every((v, i) => v === i + 1)

    results.push({
      name: 'Sequential Version Numbers',
      passed: hasSequentialVersions && isSequential,
      details: hasSequentialVersions && isSequential
        ? `✓ All versions numbered sequentially: ${sortedVersions.join(', ')}`
        : `✗ Version numbers are not sequential: ${sortedVersions.join(', ')}`,
      category: 'integrity',
    })

    eventVersions.forEach((version, index) => {
      const event = events.find(e => e.id === version.eventId)
      if (event) {
        const versionNameMatch = version.name === baseRecipe.name || version.eventName === event.name
        const hasEventContext = version.eventId === event.id && version.eventName === event.name

        results.push({
          name: `Version ${version.versionNumber}: "${version.eventName}"`,
          passed: hasEventContext,
          details: hasEventContext
            ? `✓ Linked to event "${event.name}" - ${version.ingredients.length} ingredient(s), ${version.variations.length} variation(s)`
            : `✗ Event context mismatch`,
          category: 'detail',
        })
      }
    })

    const recipeInEvents = activeEvents.filter(event => 
      event.days.some(day => 
        day.meals.some(meal => meal.recipeId === baseRecipe.id)
      )
    )

    results.push({
      name: 'Recipe Usage in Events',
      passed: recipeInEvents.length >= 2,
      details: `Recipe is used in ${recipeInEvents.length} event(s): ${recipeInEvents.map(e => `"${e.name}"`).join(', ') || 'none'}`,
      category: 'detail',
    })

    setTestResults(results)
    setIsRunning(false)
  }

  const getTestSummary = () => {
    const total = testResults.length
    const passed = testResults.filter(r => r.passed).length
    return { total, passed, failed: total - passed }
  }

  const getCategoryResults = (category: string) => {
    const categoryTests = testResults.filter(r => r.category === category)
    const passed = categoryTests.filter(r => r.passed).length
    return { total: categoryTests.length, passed }
  }

  const summary = getTestSummary()

  const categories = [
    { id: 'setup', name: 'Setup Validation', icon: Tent },
    { id: 'versioning', name: 'Independent Versioning', icon: Flask },
    { id: 'integrity', name: 'Data Integrity', icon: CheckCircle },
    { id: 'detail', name: 'Version Details', icon: ClockCounterClockwise },
  ]

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flask size={24} />
              Recipe Versioning Test Suite
            </CardTitle>
            <CardDescription>
              Verify independent versions across trips - each trip should have its own version
            </CardDescription>
          </div>
          <Button onClick={runTests} disabled={isRunning} className="gap-2">
            <Play size={16} weight="fill" />
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {testResults.length > 0 && (
          <>
            <Alert className={summary.failed === 0 ? 'border-primary bg-primary/5' : 'border-destructive bg-destructive/5'}>
              <div className="flex items-center gap-2">
                {summary.failed === 0 ? (
                  <CheckCircle size={20} className="text-primary" weight="fill" />
                ) : (
                  <XCircle size={20} className="text-destructive" weight="fill" />
                )}
                <AlertTitle className="text-lg">
                  Test Results: {summary.passed}/{summary.total} Passed
                </AlertTitle>
              </div>
              <AlertDescription className="mt-2">
                {summary.failed === 0
                  ? '✓ All tests passed! Recipe versioning is working correctly across multiple trips.'
                  : `✗ ${summary.failed} test(s) failed. Review the details below to fix versioning issues.`}
              </AlertDescription>
            </Alert>

            {categories.map(category => {
              const categoryResults = getCategoryResults(category.id)
              const categoryTests = testResults.filter(r => r.category === category.id)
              
              if (categoryTests.length === 0) return null

              const Icon = category.icon
              const allPassed = categoryResults.passed === categoryResults.total

              return (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon size={20} className={allPassed ? 'text-primary' : 'text-muted-foreground'} />
                    <h3 className="font-semibold">{category.name}</h3>
                    <Badge variant={allPassed ? 'default' : 'secondary'} className="ml-auto">
                      {categoryResults.passed}/{categoryResults.total}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    {categoryTests.map((result, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                          result.passed 
                            ? 'bg-primary/5 border-primary/20 hover:bg-primary/10' 
                            : 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10'
                        }`}
                      >
                        <div className="mt-0.5">
                          {result.passed ? (
                            <CheckCircle size={18} className="text-primary" weight="fill" />
                          ) : (
                            <XCircle size={18} className="text-destructive" weight="fill" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-sm">{result.name}</span>
                            <Badge 
                              variant={result.passed ? 'default' : 'destructive'} 
                              className="text-xs h-5"
                            >
                              {result.passed ? 'PASS' : 'FAIL'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{result.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Tent size={18} />
                Testing Instructions
              </h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Create at least 2 active events (trips) with future end dates</li>
                  <li>Create a recipe in the recipe library</li>
                  <li>Add the recipe to meals in the first trip</li>
                  <li>Edit the recipe while viewing the first trip (change servings or ingredients)</li>
                  <li>Switch to the second trip and add the same recipe to meals</li>
                  <li>Edit the recipe while viewing the second trip (make different changes)</li>
                  <li>Click "Run Tests" to verify each trip has its own independent version</li>
                  <li>View the recipe's version history to see all versions with trip badges</li>
                </ol>
              </div>
            </div>
          </>
        )}

        {testResults.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Flask size={56} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">Ready to Test</p>
            <p className="text-sm">Click "Run Tests" to verify recipe versioning across multiple trips</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
