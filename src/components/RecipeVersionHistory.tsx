import { Recipe, RecipeVersion } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ClockCounterClockwise, Users, Flame, Tent } from '@phosphor-icons/react'
import { formatQuantity } from '@/lib/helpers'

interface RecipeVersionHistoryProps {
  recipe: Recipe
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RecipeVersionHistory({ recipe, open, onOpenChange }: RecipeVersionHistoryProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClockCounterClockwise size={24} />
            Version History: {recipe.name}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4 py-4">
            {allVersions.map((version, index) => {
              const isCurrent = version.versionNumber === recipe.currentVersion
              return (
                <div
                  key={version.versionNumber}
                  className={`border rounded-lg p-4 ${isCurrent ? 'border-primary bg-primary/5' : ''}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold">Version {version.versionNumber}</h3>
                        {isCurrent && <Badge variant="default">Current</Badge>}
                        {version.eventId && (
                          <Badge variant="secondary" className="gap-1">
                            <Tent size={12} />
                            {version.eventName || 'Trip'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(version.createdAt)}
                      </p>
                      {version.changeNote && (
                        <p className="text-sm mt-1 italic text-muted-foreground">
                          {version.changeNote}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users size={16} />
                      <span>{version.servings} servings</span>
                    </div>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="details">
                      <AccordionTrigger className="text-sm">
                        View Details
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {version.description && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">Description</h4>
                              <p className="text-sm text-muted-foreground">{version.description}</p>
                            </div>
                          )}

                          <Separator />

                          <div>
                            <h4 className="text-sm font-medium mb-2">Ingredients ({version.ingredients.length})</h4>
                            <div className="space-y-1.5">
                              {version.ingredients.map((ingredient) => (
                                <div key={ingredient.id} className="flex items-center justify-between text-sm">
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
                            <h4 className="text-sm font-medium mb-2">Cooking Variations</h4>
                            <div className="space-y-3">
                              {version.variations.map((variation) => (
                                <div key={variation.id} className="border rounded p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Flame size={16} />
                                    <span className="font-medium capitalize text-sm">
                                      {variation.cookingMethod.replace('-', ' ')}
                                    </span>
                                  </div>
                                  {variation.instructions.length > 0 && (
                                    <div className="mb-2">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Instructions:</p>
                                      <ol className="list-decimal list-inside space-y-1">
                                        {variation.instructions.map((instruction, i) => (
                                          <li key={i} className="text-xs text-muted-foreground">{instruction}</li>
                                        ))}
                                      </ol>
                                    </div>
                                  )}
                                  {variation.equipment.length > 0 && (
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Equipment:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {variation.equipment.map((item, i) => (
                                          <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
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
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
