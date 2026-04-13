import { Recipe } from '@/lib/types'
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
import { Users, Flame, GitBranch } from '@phosphor-icons/react'
import { formatQuantity } from '@/lib/helpers'

interface RecipeDetailDialogProps {
  recipe: Recipe
  recipes?: Recipe[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateRecipe: (recipe: Recipe) => void
}

export function RecipeDetailDialog({ recipe, recipes, open, onOpenChange }: RecipeDetailDialogProps) {
  const originalRecipe = recipe.clonedFrom && recipes?.find(r => r.id === recipe.clonedFrom)
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{recipe.name}</DialogTitle>
          {recipe.description && (
            <p className="text-muted-foreground">{recipe.description}</p>
          )}
          {originalRecipe && (
            <Badge variant="outline" className="gap-1.5 w-fit mt-2">
              <GitBranch size={14} />
              Cloned from {originalRecipe.name}
            </Badge>
          )}
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 py-4">
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
  )
}
