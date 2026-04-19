import { useState } from 'react'
import { format } from 'date-fns'
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
import { Users, Flame, GitBranch, ClockCounterClockwise, Star } from '@phosphor-icons/react'
import { formatQuantity, calculateRecipeRatings, revertRecipeToVersion } from '@/lib/helpers'
import { useRecipeFeedback } from '@/hooks/useFeedback'
import { RecipeVersionHistory } from './RecipeVersionHistory'

interface RecipeDetailDialogProps {
  recipe: Recipe
  recipes?: Recipe[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateRecipe: (recipe: Recipe) => void
}

function getOverallRating(rating: { taste: number; difficulty: number; portionSize: number }) {
  return (rating.taste + rating.difficulty + rating.portionSize) / 3
}

export function RecipeDetailDialog({ recipe, recipes, open, onOpenChange, onUpdateRecipe }: RecipeDetailDialogProps) {
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const { data: recipeFeedback = [] } = useRecipeFeedback(recipe.id, open)
  const originalRecipe = recipe.clonedFrom && recipes?.find(r => r.id === recipe.clonedFrom)
  const hasVersionHistory = recipe.versions && recipe.versions.length > 0
  const ratingSummary = calculateRecipeRatings(recipe.id, recipe.name, recipeFeedback)
  
  const handleRevertVersion = (versionNumber: number) => {
    const revertedRecipe = revertRecipeToVersion(recipe, versionNumber)
    onUpdateRecipe(revertedRecipe)
  }
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
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
          </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 py-4">
            {ratingSummary && (
              <>
                <Card className="bg-accent/5 border-accent/20">
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

            <div>
              <h3 className="font-semibold mb-3">Feedback History</h3>
              {recipeFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback history yet for this recipe.</p>
              ) : (
                <div className="space-y-3">
                  {recipeFeedback.map((entry) => (
                    <Card key={entry.id}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{entry.eventName || 'Unknown event'}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.eventDate ? format(new Date(entry.eventDate), 'MMM d, yyyy') : 'Date unavailable'}
                              {entry.scoutName ? ` • ${entry.scoutName}` : ''}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {getOverallRating(entry.rating).toFixed(1)} / 5
                          </span>
                        </div>
                        {entry.comments && <p className="text-sm">{entry.comments}</p>}
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
              <Accordion type="single" collapsible className="w-full">
                {recipe.variations.map((variation, index) => (
                  <AccordionItem key={variation.id} value={`variation-${index}`}>
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Flame size={16} />
                        <span className="capitalize">{variation.cookingMethod.replace('-', ' ')}</span>
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
