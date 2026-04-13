import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, Flask, Tent, ClockCounterClockwise } from '@phosphor-icons/react'
import { Event, Recipe } from '@/lib/types'
import { isEventActive } from '@/lib/helpers'

interface TestResult {
  name: string
  passed: boolean
  details: string
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
      })
      setTestResults(results)
      setIsRunning(false)
      return
    }

    results.push({
      name: 'Find Base Recipe',
      passed: true,
      details: `Found recipe: ${baseRecipe.name}`,
    })

    const activeEvents = events.filter(isEventActive)
    
    if (activeEvents.length < 2) {
      results.push({
        name: 'Find Multiple Active Events',
        passed: false,
        details: `Found ${activeEvents.length} active events. Need at least 2 active events to test independent versioning.`,
      })
      setTestResults(results)
      setIsRunning(false)
      return
    }

    results.push({
      name: 'Find Multiple Active Events',
      passed: true,
      details: `Found ${activeEvents.length} active events: ${activeEvents.map(e => e.name).join(', ')}`,
    })

    const eventVersions = baseRecipe.versions.filter(v => v.eventId)
    const uniqueEventIds = new Set(eventVersions.map(v => v.eventId))

    results.push({
      name: 'Check Version Count',
      passed: eventVersions.length > 0,
      details: `Recipe has ${eventVersions.length} event-specific versions across ${uniqueEventIds.size} unique events`,
    })

    if (uniqueEventIds.size >= 2) {
      results.push({
        name: 'Independent Versioning',
        passed: true,
        details: `✓ Recipe has been edited on ${uniqueEventIds.size} different trips with independent versions`,
      })

      const versionsByEvent = new Map<string, number>()
      eventVersions.forEach(v => {
        if (v.eventId) {
          versionsByEvent.set(v.eventId, (versionsByEvent.get(v.eventId) || 0) + 1)
        }
      })

      let independentVersionsPassed = true
      versionsByEvent.forEach((count, eventId) => {
        if (count > 1) {
          independentVersionsPassed = false
        }
      })

      results.push({
        name: 'One Version Per Event',
        passed: independentVersionsPassed,
        details: independentVersionsPassed 
          ? '✓ Each event has exactly one version (multiple edits in one trip = one version)'
          : '✗ Some events have multiple versions (should be consolidated)',
      })
    } else {
      results.push({
        name: 'Independent Versioning',
        passed: false,
        details: `Recipe needs to be edited on at least 2 different trips. Currently edited on ${uniqueEventIds.size} trips.`,
      })
    }

    const currentVersionNumber = baseRecipe.currentVersion
    const expectedVersionNumber = 1 + uniqueEventIds.size

    results.push({
      name: 'Version Number Increment',
      passed: currentVersionNumber === expectedVersionNumber,
      details: `Current version: ${currentVersionNumber}, Expected: ${expectedVersionNumber} (1 base + ${uniqueEventIds.size} event versions)`,
    })

    eventVersions.forEach((version, index) => {
      const event = events.find(e => e.id === version.eventId)
      if (event) {
        results.push({
          name: `Version ${version.versionNumber} - ${version.eventName}`,
          passed: true,
          details: `Created for "${event.name}" - ${version.ingredients.length} ingredients, ${version.variations.length} variations`,
        })
      }
    })

    setTestResults(results)
    setIsRunning(false)
  }

  const getTestSummary = () => {
    const total = testResults.length
    const passed = testResults.filter(r => r.passed).length
    return { total, passed, failed: total - passed }
  }

  const summary = getTestSummary()

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
              Test that editing recipes on multiple trips creates independent versions
            </CardDescription>
          </div>
          <Button onClick={runTests} disabled={isRunning} className="gap-2">
            <Flask size={16} />
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {testResults.length > 0 && (
          <>
            <Alert className={summary.failed === 0 ? 'border-primary' : 'border-destructive'}>
              <div className="flex items-center gap-2">
                {summary.failed === 0 ? (
                  <CheckCircle size={20} className="text-primary" />
                ) : (
                  <XCircle size={20} className="text-destructive" />
                )}
                <AlertTitle>
                  Test Results: {summary.passed}/{summary.total} Passed
                </AlertTitle>
              </div>
              <AlertDescription>
                {summary.failed === 0
                  ? 'All tests passed! Recipe versioning is working correctly across multiple trips.'
                  : `${summary.failed} test(s) failed. Review the details below.`}
              </AlertDescription>
            </Alert>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <ClockCounterClockwise size={18} />
                Test Details
              </h3>
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    result.passed ? 'bg-primary/5 border-primary/20' : 'bg-destructive/5 border-destructive/20'
                  }`}
                >
                  <div className="mt-0.5">
                    {result.passed ? (
                      <CheckCircle size={18} className="text-primary" />
                    ) : (
                      <XCircle size={18} className="text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.name}</span>
                      <Badge variant={result.passed ? 'default' : 'destructive'} className="text-xs">
                        {result.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.details}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <Tent size={18} />
                How to Test
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Create at least 2 active events (trips) with future end dates</li>
                <li>Create a recipe in the recipe library</li>
                <li>Add the recipe to meals in the first trip</li>
                <li>Edit the recipe while viewing the first trip (e.g., change servings or ingredients)</li>
                <li>Switch to the second trip and add the same recipe to meals</li>
                <li>Edit the recipe while viewing the second trip (make different changes)</li>
                <li>Run this test to verify each trip has its own independent version</li>
                <li>View the recipe's version history to see all versions with trip badges</li>
              </ol>
            </div>
          </>
        )}

        {testResults.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Flask size={48} className="mx-auto mb-4 opacity-50" />
            <p>Click "Run Tests" to verify recipe versioning across multiple trips</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
