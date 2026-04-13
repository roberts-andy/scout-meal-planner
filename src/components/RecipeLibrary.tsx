import { useState, useMemo } from 'react'
import { Recipe, MealFeedback } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Plus, CookingPot, Trash, Pencil, Users, Flame, Copy, GitBranch, Star, Funnel, X } from '@phosphor-icons/react'
import { CreateRecipeDialog } from './CreateRecipeDialog'
import { RecipeDetailDialog } from './RecipeDetailDialog'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { calculateRecipeRatings } from '@/lib/helpers'

interface RecipeLibraryProps {
  recipes: Recipe[]
  feedback: MealFeedback[]
  onCreateRecipe: (recipe: Recipe) => void
  onUpdateRecipe: (recipe: Recipe) => void
  onDeleteRecipe: (recipeId: string) => void
}

export function RecipeLibrary({ recipes, feedback, onCreateRecipe, onUpdateRecipe, onDeleteRecipe }: RecipeLibraryProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [minRating, setMinRating] = useState<number>(0)
  const [showRatingFilter, setShowRatingFilter] = useState(false)

  const handleCloneRecipe = (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation()
    const clonedRecipe: Recipe = {
      ...recipe,
      id: `recipe-${Date.now()}`,
      name: `${recipe.name} (Copy)`,
      clonedFrom: recipe.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      currentVersion: 1,
      versions: [],
    }
    onCreateRecipe(clonedRecipe)
    toast.success(`Cloned "${recipe.name}"`)
  }

  const filteredRecipes = useMemo(() => {
    if (minRating === 0) return recipes

    return recipes.filter(recipe => {
      const ratingSummary = calculateRecipeRatings(recipe.id, recipe.name, feedback)
      if (!ratingSummary) return false
      return ratingSummary.overallAverage >= minRating
    })
  }, [recipes, feedback, minRating])

  const handleResetFilter = () => {
    setMinRating(0)
    setShowRatingFilter(false)
  }

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <CookingPot size={64} weight="duotone" className="text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No recipes yet</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          Build your recipe library with camping favorites, complete with ingredients, instructions, and cooking methods
        </p>
        <Button onClick={() => setIsCreateDialogOpen(true)} size="lg" className="gap-2">
          <Plus size={20} />
          Create First Recipe
        </Button>
        <CreateRecipeDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreateRecipe={onCreateRecipe}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Recipe Library</h2>
          <p className="text-muted-foreground mt-1">Your collection of scout-tested recipes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showRatingFilter ? "default" : "outline"}
            onClick={() => setShowRatingFilter(!showRatingFilter)}
            className="gap-2"
          >
            <Funnel size={20} />
            Filter by Rating
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus size={20} />
            New Recipe
          </Button>
        </div>
      </div>

      {showRatingFilter && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-muted/50 p-4 rounded-lg border border-border"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px] space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="rating-filter" className="text-sm font-medium">
                  Minimum Rating
                </Label>
                <div className="flex items-center gap-2">
                  <Star size={16} weight="fill" className="text-accent" />
                  <span className="text-sm font-semibold">{minRating.toFixed(1)} / 5.0</span>
                </div>
              </div>
              <Slider
                id="rating-filter"
                min={0}
                max={5}
                step={0.5}
                value={[minRating]}
                onValueChange={(value) => setMinRating(value[0])}
                className="w-full"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilter}
              className="gap-2"
            >
              <X size={16} />
              Clear Filter
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Showing {filteredRecipes.length} of {recipes.length} recipes
          </p>
        </motion.div>
      )}

      {filteredRecipes.length === 0 && minRating > 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <Star size={64} weight="duotone" className="text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No recipes match this rating</h2>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Try lowering the minimum rating threshold to see more recipes
          </p>
          <Button onClick={handleResetFilter} variant="outline" className="gap-2">
            <X size={20} />
            Clear Filter
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe, index) => {
          const ratingSummary = calculateRecipeRatings(recipe.id, recipe.name, feedback)
          
          return (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] group"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate">{recipe.name}</CardTitle>
                      {recipe.description && (
                        <CardDescription className="mt-1.5 line-clamp-2">
                          {recipe.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingRecipe(recipe)
                        }}
                      >
                        <Pencil size={16} className="text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleCloneRecipe(recipe, e)}
                      >
                        <Copy size={16} className="text-accent" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteRecipe(recipe.id)
                        }}
                      >
                        <Trash size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {ratingSummary && (
                    <div className="mb-3 p-2 bg-accent/10 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Star size={16} weight="fill" className="text-accent" />
                        <span className="font-semibold text-sm">
                          {ratingSummary.overallAverage.toFixed(1)} / 5.0
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({ratingSummary.totalFeedback} review{ratingSummary.totalFeedback !== 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Taste: {ratingSummary.averageRatings.taste.toFixed(1)} • 
                        Difficulty: {ratingSummary.averageRatings.difficulty.toFixed(1)} • 
                        Portion: {ratingSummary.averageRatings.portionSize.toFixed(1)}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {recipe.clonedFrom && (() => {
                      const originalRecipe = recipes.find(r => r.id === recipe.clonedFrom)
                      return originalRecipe && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <GitBranch size={12} />
                          Cloned from {originalRecipe.name}
                        </Badge>
                      )
                    })()}
                    {recipe.versions && recipe.versions.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        v{recipe.currentVersion || 1}
                      </Badge>
                    )}
                    {recipe.variations.slice(0, 2).map((variation) => (
                      <Badge key={variation.id} variant="secondary" className="gap-1">
                        <Flame size={14} />
                        {variation.cookingMethod.replace('-', ' ')}
                      </Badge>
                    ))}
                    {recipe.variations.length > 2 && (
                      <Badge variant="outline">+{recipe.variations.length - 2} more</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users size={16} />
                      {recipe.servings} servings
                    </span>
                    <span>•</span>
                    <span>{recipe.ingredients.length} ingredients</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
        </div>
      )}

      <CreateRecipeDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateRecipe={onCreateRecipe}
      />

      {editingRecipe && (
        <CreateRecipeDialog
          open={!!editingRecipe}
          onOpenChange={(open) => !open && setEditingRecipe(null)}
          onCreateRecipe={(recipe) => {
            onUpdateRecipe({ ...recipe, id: editingRecipe.id })
            setEditingRecipe(null)
          }}
          initialRecipe={editingRecipe}
        />
      )}

      {selectedRecipe && (
        <RecipeDetailDialog
          recipe={selectedRecipe}
          recipes={recipes}
          feedback={feedback}
          open={!!selectedRecipe}
          onOpenChange={(open) => !open && setSelectedRecipe(null)}
          onUpdateRecipe={onUpdateRecipe}
        />
      )}
    </div>
  )
}
