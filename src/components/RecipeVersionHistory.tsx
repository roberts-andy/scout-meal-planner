import { useState } from 'react'
import { Recipe, RecipeVersion, Ingredient, RecipeVariation } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClockCounterClockwise, Users, Flame, Tent, ArrowsLeftRight, ListChecks, CalendarBlank, Plus, Minus, ArrowRight } from '@phosphor-icons/react'
import { formatQuantity } from '@/lib/helpers'

interface RecipeVersionHistoryProps {
  recipe: Recipe
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface VersionChange {
  field: string
  oldValue: string | number | undefined
  newValue: string | number | undefined
  type: 'added' | 'removed' | 'modified'
}

export function RecipeVersionHistory({ recipe, open, onOpenChange }: RecipeVersionHistoryProps) {
  const [selectedVersions, setSelectedVersions] = useState<[number, number] | null>(null)
  
  const currentVersionData: RecipeVersion = {
    versionNumber: recipe.currentVersion,
    eventId: undefined,
    eventName: undefined,
    name: recipe.name,
    description: recipe.description,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    variations: recipe.variations,
    tags: recipe.tags,
    createdAt: recipe.updatedAt,
    changeNote: 'Current version',
  }
  
  const allVersions = [currentVersionData, ...recipe.versions].sort(
    (a, b) => b.versionNumber - a.versionNumber
  )

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getVersionChanges = (oldVersion: RecipeVersion, newVersion: RecipeVersion): VersionChange[] => {
    const changes: VersionChange[] = []

    if (oldVersion.name !== newVersion.name) {
      changes.push({
        field: 'Recipe Name',
        oldValue: oldVersion.name,
        newValue: newVersion.name,
        type: 'modified'
      })
    }

    if (oldVersion.description !== newVersion.description) {
      changes.push({
        field: 'Description',
        oldValue: oldVersion.description,
        newValue: newVersion.description,
        type: oldVersion.description && !newVersion.description ? 'removed' : !oldVersion.description ? 'added' : 'modified'
      })
    }

    if (oldVersion.servings !== newVersion.servings) {
      changes.push({
        field: 'Servings',
        oldValue: oldVersion.servings,
        newValue: newVersion.servings,
        type: 'modified'
      })
    }

    const oldIngredientNames = new Set(oldVersion.ingredients.map(i => i.name.toLowerCase()))
    const newIngredientNames = new Set(newVersion.ingredients.map(i => i.name.toLowerCase()))

    newVersion.ingredients.forEach(ing => {
      if (!oldIngredientNames.has(ing.name.toLowerCase())) {
        changes.push({
          field: 'Ingredient',
          oldValue: undefined,
          newValue: `${ing.name} (${formatQuantity(ing.quantity, ing.unit)} ${ing.unit})`,
          type: 'added'
        })
      }
    })

    oldVersion.ingredients.forEach(ing => {
      if (!newIngredientNames.has(ing.name.toLowerCase())) {
        changes.push({
          field: 'Ingredient',
          oldValue: `${ing.name} (${formatQuantity(ing.quantity, ing.unit)} ${ing.unit})`,
          newValue: undefined,
          type: 'removed'
        })
      } else {
        const newIng = newVersion.ingredients.find(i => i.name.toLowerCase() === ing.name.toLowerCase())
        if (newIng && (ing.quantity !== newIng.quantity || ing.unit !== newIng.unit)) {
          changes.push({
            field: 'Ingredient',
            oldValue: `${ing.name} (${formatQuantity(ing.quantity, ing.unit)} ${ing.unit})`,
            newValue: `${newIng.name} (${formatQuantity(newIng.quantity, newIng.unit)} ${newIng.unit})`,
            type: 'modified'
          })
        }
      }
    })

    const oldMethodNames = new Set(oldVersion.variations.map(v => v.cookingMethod))
    const newMethodNames = new Set(newVersion.variations.map(v => v.cookingMethod))

    newVersion.variations.forEach(variation => {
      if (!oldMethodNames.has(variation.cookingMethod)) {
        changes.push({
          field: 'Cooking Method',
          oldValue: undefined,
          newValue: variation.cookingMethod.replace('-', ' '),
          type: 'added'
        })
      }
    })

    oldVersion.variations.forEach(variation => {
      if (!newMethodNames.has(variation.cookingMethod)) {
        changes.push({
          field: 'Cooking Method',
          oldValue: variation.cookingMethod.replace('-', ' '),
          newValue: undefined,
          type: 'removed'
        })
      }
    })

    return changes
  }

  const compareVersions = (v1Num: number, v2Num: number) => {
    const v1 = allVersions.find(v => v.versionNumber === v1Num)
    const v2 = allVersions.find(v => v.versionNumber === v2Num)
    if (!v1 || !v2) return []
    
    return getVersionChanges(v1Num < v2Num ? v1 : v2, v1Num < v2Num ? v2 : v1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClockCounterClockwise size={24} />
            Complete Edit History: {recipe.name}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="timeline" className="gap-2">
              <CalendarBlank size={16} />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <ArrowsLeftRight size={16} />
              Compare Versions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-0">
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4 py-2">
                {allVersions.map((version, index) => {
                  const isCurrent = version.versionNumber === recipe.currentVersion
                  const previousVersion = allVersions[index + 1]
                  const changes = previousVersion ? getVersionChanges(previousVersion, version) : []
                  
                  return (
                    <div key={version.versionNumber} className="relative">
                      {index < allVersions.length - 1 && (
                        <div className="absolute left-4 top-12 bottom-[-16px] w-0.5 bg-border" />
                      )}
                      
                      <Card className={isCurrent ? 'border-primary shadow-sm' : ''}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <span className="text-sm font-semibold">{version.versionNumber}</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <CardTitle className="text-base">Version {version.versionNumber}</CardTitle>
                                  {isCurrent && <Badge variant="default">Current</Badge>}
                                  {version.eventId && (
                                    <Badge variant="secondary" className="gap-1">
                                      <Tent size={12} />
                                      {version.eventName || 'Trip'}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(version.createdAt)}
                                </p>
                                {version.changeNote && (
                                  <p className="text-sm mt-1.5 italic text-muted-foreground">
                                    "{version.changeNote}"
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users size={14} />
                              <span>{version.servings}</span>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-3">
                          {changes.length > 0 && (
                            <div className="bg-muted/50 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <ListChecks size={14} className="text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  Changes from v{previousVersion?.versionNumber}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {changes.map((change, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-xs">
                                    {change.type === 'added' && (
                                      <Plus size={14} className="text-green-600 shrink-0 mt-0.5" weight="bold" />
                                    )}
                                    {change.type === 'removed' && (
                                      <Minus size={14} className="text-destructive shrink-0 mt-0.5" weight="bold" />
                                    )}
                                    {change.type === 'modified' && (
                                      <ArrowRight size={14} className="text-accent shrink-0 mt-0.5" weight="bold" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium">{change.field}:</span>{' '}
                                      {change.type === 'added' && (
                                        <span className="text-green-700">Added "{change.newValue}"</span>
                                      )}
                                      {change.type === 'removed' && (
                                        <span className="text-destructive">Removed "{change.oldValue}"</span>
                                      )}
                                      {change.type === 'modified' && (
                                        <span>
                                          <span className="line-through text-muted-foreground">{change.oldValue}</span>
                                          {' → '}
                                          <span className="text-accent font-medium">{change.newValue}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="details" className="border-none">
                              <AccordionTrigger className="text-xs py-2 hover:no-underline">
                                View Full Recipe Details
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3 pt-2">
                                  {version.description && (
                                    <>
                                      <div>
                                        <h4 className="text-xs font-medium mb-1">Description</h4>
                                        <p className="text-xs text-muted-foreground">{version.description}</p>
                                      </div>
                                      <Separator />
                                    </>
                                  )}

                                  <div>
                                    <h4 className="text-xs font-medium mb-2">Ingredients ({version.ingredients.length})</h4>
                                    <div className="space-y-1">
                                      {version.ingredients.map((ingredient) => (
                                        <div key={ingredient.id} className="flex items-center justify-between text-xs">
                                          <span>{ingredient.name}</span>
                                          <span className="text-muted-foreground">
                                            {formatQuantity(ingredient.quantity, ingredient.unit)} {ingredient.unit !== 'to-taste' && ingredient.unit}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  <Separator />

                                  <div>
                                    <h4 className="text-xs font-medium mb-2">Cooking Methods</h4>
                                    <div className="space-y-2">
                                      {version.variations.map((variation) => (
                                        <div key={variation.id} className="border rounded p-2">
                                          <div className="flex items-center gap-1.5 mb-1.5">
                                            <Flame size={12} />
                                            <span className="font-medium capitalize text-xs">
                                              {variation.cookingMethod.replace('-', ' ')}
                                            </span>
                                          </div>
                                          {variation.instructions.length > 0 && (
                                            <div className="mb-1.5">
                                              <p className="text-[10px] font-medium text-muted-foreground mb-1">Instructions:</p>
                                              <ol className="list-decimal list-inside space-y-0.5">
                                                {variation.instructions.map((instruction, i) => (
                                                  <li key={i} className="text-[10px] text-muted-foreground">{instruction}</li>
                                                ))}
                                              </ol>
                                            </div>
                                          )}
                                          {variation.equipment.length > 0 && (
                                            <div>
                                              <p className="text-[10px] font-medium text-muted-foreground mb-1">Equipment:</p>
                                              <div className="flex flex-wrap gap-1">
                                                {variation.equipment.map((item, i) => (
                                                  <Badge key={i} variant="outline" className="text-[10px] h-4 px-1">{item}</Badge>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="compare" className="mt-0">
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4 py-2">
                <div className="text-sm text-muted-foreground mb-4">
                  Select two versions to compare their differences
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <Label className="text-xs mb-2 block">Version A</Label>
                    <div className="space-y-2">
                      {allVersions.map((version) => (
                        <Button
                          key={version.versionNumber}
                          variant={selectedVersions?.[0] === version.versionNumber ? 'default' : 'outline'}
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setSelectedVersions(prev => 
                            prev ? [version.versionNumber, prev[1]] : [version.versionNumber, version.versionNumber]
                          )}
                        >
                          <span className="font-semibold">v{version.versionNumber}</span>
                          {version.eventName && (
                            <span className="text-xs opacity-75">({version.eventName})</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs mb-2 block">Version B</Label>
                    <div className="space-y-2">
                      {allVersions.map((version) => (
                        <Button
                          key={version.versionNumber}
                          variant={selectedVersions?.[1] === version.versionNumber ? 'default' : 'outline'}
                          size="sm"
                          className="w-full justify-start gap-2"
                          onClick={() => setSelectedVersions(prev => 
                            prev ? [prev[0], version.versionNumber] : [version.versionNumber, version.versionNumber]
                          )}
                        >
                          <span className="font-semibold">v{version.versionNumber}</span>
                          {version.eventName && (
                            <span className="text-xs opacity-75">({version.eventName})</span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedVersions && selectedVersions[0] !== selectedVersions[1] && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ArrowsLeftRight size={18} />
                        Comparing v{selectedVersions[0]} → v{selectedVersions[1]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {compareVersions(selectedVersions[0], selectedVersions[1]).map((change, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                            {change.type === 'added' && (
                              <Plus size={16} className="text-green-600 shrink-0 mt-0.5" weight="bold" />
                            )}
                            {change.type === 'removed' && (
                              <Minus size={16} className="text-destructive shrink-0 mt-0.5" weight="bold" />
                            )}
                            {change.type === 'modified' && (
                              <ArrowRight size={16} className="text-accent shrink-0 mt-0.5" weight="bold" />
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{change.field}:</span>{' '}
                              {change.type === 'added' && (
                                <span className="text-green-700">Added "{change.newValue}"</span>
                              )}
                              {change.type === 'removed' && (
                                <span className="text-destructive">Removed "{change.oldValue}"</span>
                              )}
                              {change.type === 'modified' && (
                                <div className="mt-1">
                                  <div className="text-xs text-muted-foreground line-through">{change.oldValue}</div>
                                  <div className="text-xs text-accent font-medium">{change.newValue}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {compareVersions(selectedVersions[0], selectedVersions[1]).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            No differences found between these versions
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedVersions && selectedVersions[0] === selectedVersions[1] && (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Please select two different versions to compare
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
