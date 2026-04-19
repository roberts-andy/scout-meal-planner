import { useState } from 'react'
import { Recipe } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Flame, GitBranch, ClockCounterClockwise, Star, Printer } from '@phosphor-icons/react'
import { formatQuantity, calculateRecipeRatings, revertRecipeToVersion } from '@/lib/helpers'
import { RecipeVersionHistory } from './RecipeVersionHistory'
import { useRecipeFeedback } from '@/hooks/useFeedback'

interface RecipeDetailDialogProps {
  recipe: Recipe
  recipes?: Recipe[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateRecipe: (recipe: Recipe) => void
}

function formatEventDate(date?: string): string {
  if (!date) return 'Unknown date'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function RecipeDetailDialog({ recipe, recipes, open, onOpenChange, onUpdateRecipe }: RecipeDetailDialogProps) {
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const { data: feedback = [], isLoading: isFeedbackLoading } = useRecipeFeedback(recipe.id, open)
  const originalRecipe = recipe.clonedFrom && recipes?.find(r => r.id === recipe.clonedFrom)
  const hasVersionHistory = recipe.versions && recipe.versions.length > 0
  const ratingSummary = calculateRecipeRatings(recipe.id, recipe.name, feedback)
  
  const handleRevertVersion = (versionNumber: number) => {
    const revertedRecipe = revertRecipeToVersion(recipe, versionNumber)
    onUpdateRecipe(revertedRecipe)
  }

  const handlePrint = () => {
    window.print()
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="recipe-print-root sm:max-w-[700px] max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
                {recipe.description && (
                  <p className="text-muted-foreground mt-1">{recipe.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {originalRecipe && (
                    <Badge variant="outline" className="gap-1.5">
                      <GitBranch size={14} />
                      Cloned from {originalRecipe.name}
                    </Badge>
                  )}
                  {hasVersionHistory && (
                    <Badge variant="secondary" className="gap-1">
                      v{recipe.currentVersion}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 no-print">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={handlePrint}
                >
                  <Printer size={16} />
                  Print
                </Button>
                {hasVersionHistory && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => setShowVersionHistory(true)}
                  >
                    <ClockCounterClockwise size={16} />
                    History
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>
        <ScrollArea className="recipe-print-scroll max-h-[70vh] pr-4">
          <div className="space-y-6 py-4">
            {ratingSummary && (
              <>
                <Card className="bg-accent/5 border-accent/20 no-print">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-2 mb-1">
                          <Star size={28} weight="fill" className="text-accent" />
                          <span className="text-3xl font-bold">
                            {ratingSummary.overallAverage.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {ratingSummary.totalFeedback} review{ratingSummary.totalFeedback !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          from {ratingSummary.eventCount} event{ratingSummary.eventCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Taste</span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  weight={i < Math.round(ratingSummary.averageRatings.taste) ? 'fill' : 'regular'}
                                  className={i < Math.round(ratingSummary.averageRatings.taste) ? 'text-accent' : 'text-muted-foreground'}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground w-8">
                              {ratingSummary.averageRatings.taste.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Difficulty</span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  weight={i < Math.round(ratingSummary.averageRatings.difficulty) ? 'fill' : 'regular'}
                                  className={i < Math.round(ratingSummary.averageRatings.difficulty) ? 'text-accent' : 'text-muted-foreground'}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground w-8">
                              {ratingSummary.averageRatings.difficulty.toFixed(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Portion Size</span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={14}
                                  weight={i < Math.round(ratingSummary.averageRatings.portionSize) ? 'fill' : 'regular'}
                                  className={i < Math.round(ratingSummary.averageRatings.portionSize) ? 'text-accent' : 'text-muted-foreground'}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground w-8">
                              {ratingSummary.averageRatings.portionSize.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Separator />
              </>
            )}

            <div className="space-y-3 no-print">
              <h3 className="font-semibold">Past Feedback</h3>
              {isFeedbackLoading ? (
                <p className="text-sm text-muted-foreground">Loading feedback history...</p>
              ) : feedback.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback history yet for this recipe.</p>
              ) : (
                <div className="space-y-3">
                  {feedback.map((entry) => (
                    <Card key={entry.id}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{entry.eventName || 'Unknown event'}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{formatEventDate(entry.eventDate)}</span>
                        </div>
                        {entry.comments && (
                          <p className="text-sm">{entry.comments}</p>
                        )}
                        {!entry.comments && (
                          <p className="text-sm text-muted-foreground">No comment provided.</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
             
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Users size={16} />
                <span>{recipe.servings} servings</span>
              </div>
              <span>•</span>
              <span>{recipe.ingredients.length} ingredients</span>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Ingredients</h3>
              <div className="space-y-2">
                {recipe.ingredients.map((ingredient) => (
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
              <h3 className="font-semibold mb-3">Cooking Variations</h3>
              <Accordion type="single" collapsible className="w-full no-print">
                {recipe.variations.map((variation, index) => (
                  <AccordionItem key={variation.id} value={`variation-${index}`}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Flame size={16} />
                          <span className="capitalize">{variation.cookingMethod.replaceAll('-', ' ')}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {variation.instructions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Instructions</h4>
                            <ol className="list-decimal list-inside space-y-2">
                              {variation.instructions.map((instruction, i) => (
                                <li key={i} className="text-sm text-muted-foreground">{instruction}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {variation.equipment.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium mb-2">Equipment Needed</h4>
                            <div className="flex flex-wrap gap-2">
                              {variation.equipment.map((item, i) => (
                                <Badge key={i} variant="outline">{item}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <div className="print-only space-y-4">
                {recipe.variations.map((variation) => (
                  <div key={variation.id} className="recipe-print-section space-y-3">
                    <h4 className="text-sm font-semibold capitalize">{variation.cookingMethod.replaceAll('-', ' ')}</h4>
                    {variation.instructions.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-1">Instructions</h5>
                        <ol className="recipe-print-list list-decimal space-y-1">
                          {variation.instructions.map((instruction, i) => (
                            <li key={i} className="text-sm text-muted-foreground">{instruction}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {variation.equipment.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium mb-1">Equipment Needed</h5>
                        <ul className="recipe-print-equipment">
                          {variation.equipment.map((item, i) => (
                            <li key={i} className="text-sm text-muted-foreground">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>

    <RecipeVersionHistory
      recipe={recipe}
      open={showVersionHistory}
      onOpenChange={setShowVersionHistory}
      onRevertVersion={handleRevertVersion}
    />
    </>
  )
}
