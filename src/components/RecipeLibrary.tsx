import { useState, useMemo } from 'react'
import { Recipe, MealFeedback, CookingMethod } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, CookingPot, Trash, Pencil, Users, Flame, Copy, GitBranch, Star, Funnel, X, ArrowsDownUp } from '@phosphor-icons/react'
import { CreateRecipeDialog } from './CreateRecipeDialog'
import { RecipeDetailDialog } from './RecipeDetailDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { calculateRecipeRatings } from '@/lib/helpers'

type SortOption = 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest' | 'rating-high' | 'rating-low'

const COOKING_METHODS: { value: CookingMethod; label: string }[] = [
  { value: 'open-fire', label: 'Open Fire' },
  { value: 'camp-stove', label: 'Camp Stove' },
  { value: 'dutch-oven', label: 'Dutch Oven' },
  { value: 'skillet', label: 'Skillet' },
  { value: 'grill', label: 'Grill' },
  { value: 'no-cook', label: 'No Cook' },
  { value: 'other', label: 'Other' },
]

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
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('date-newest')
  const [selectedCookingMethods, setSelectedCookingMethods] = useState<CookingMethod[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])

  const allEquipment = useMemo(() => {
    const equipmentSet = new Set<string>()
    recipes.forEach(recipe => {
      recipe.variations.forEach(variation => {
        variation.equipment.forEach(eq => equipmentSet.add(eq))
      })
    })
    return Array.from(equipmentSet).sort()
  }, [recipes])

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
    let filtered = recipes

    if (minRating > 0) {
      filtered = filtered.filter(recipe => {
        const ratingSummary = calculateRecipeRatings(recipe.id, recipe.name, feedback)
        if (!ratingSummary) return false
        return ratingSummary.overallAverage >= minRating
      })
    }

    if (selectedCookingMethods.length > 0) {
      filtered = filtered.filter(recipe =>
        recipe.variations.some(variation =>
          selectedCookingMethods.includes(variation.cookingMethod)
        )
      )
    }

    if (selectedEquipment.length > 0) {
      filtered = filtered.filter(recipe =>
        recipe.variations.some(variation =>
          selectedEquipment.some(eq => variation.equipment.includes(eq))
        )
      )
    }

    return filtered
  }, [recipes, feedback, minRating, selectedCookingMethods, selectedEquipment])

  const sortedRecipes = useMemo(() => {
    const sorted = [...filteredRecipes]

    switch (sortBy) {
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name))
      case 'date-newest':
        return sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      case 'date-oldest':
        return sorted.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      case 'rating-high':
        return sorted.sort((a, b) => {
          const ratingA = calculateRecipeRatings(a.id, a.name, feedback)?.overallAverage || 0
          const ratingB = calculateRecipeRatings(b.id, b.name, feedback)?.overallAverage || 0
          return ratingB - ratingA
        })
      case 'rating-low':
        return sorted.sort((a, b) => {
          const ratingA = calculateRecipeRatings(a.id, a.name, feedback)?.overallAverage || 0
          const ratingB = calculateRecipeRatings(b.id, b.name, feedback)?.overallAverage || 0
          return ratingA - ratingB
        })
      default:
        return sorted
    }
  }, [filteredRecipes, sortBy, feedback])

  const handleResetFilter = () => {
    setMinRating(0)
    setShowRatingFilter(false)
  }

  const handleResetAllFilters = () => {
    setMinRating(0)
    setShowRatingFilter(false)
    setShowFilters(false)
    setSelectedCookingMethods([])
    setSelectedEquipment([])
  }

  const toggleCookingMethod = (method: CookingMethod) => {
    setSelectedCookingMethods(current =>
      current.includes(method)
        ? current.filter(m => m !== method)
        : [...current, method]
    )
  }

  const toggleEquipment = (equipment: string) => {
    setSelectedEquipment(current =>
      current.includes(equipment)
        ? current.filter(e => e !== equipment)
        : [...current, equipment]
    )
  }

  const hasActiveFilters = minRating > 0 || selectedCookingMethods.length > 0 || selectedEquipment.length > 0

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
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <ArrowsDownUp size={16} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-newest">Newest First</SelectItem>
              <SelectItem value="date-oldest">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="rating-high">Highest Rated</SelectItem>
              <SelectItem value="rating-low">Lowest Rated</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 relative"
          >
            <Funnel size={20} />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {(minRating > 0 ? 1 : 0) + selectedCookingMethods.length + selectedEquipment.length}
              </Badge>
            )}
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus size={20} />
            New Recipe
          </Button>
        </div>
      </div>

      {showFilters && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-muted/50 p-6 rounded-lg border border-border"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Filter Recipes</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetAllFilters}
                  className="gap-2"
                >
                  <X size={16} />
                  Clear All Filters
                </Button>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Star size={16} weight="fill" className="text-accent" />
                    Minimum Rating
                  </Label>
                  <span className="text-sm font-semibold">{minRating.toFixed(1)} / 5.0</span>
                </div>
                <Slider
                  min={0}
                  max={5}
                  step={0.5}
                  value={[minRating]}
                  onValueChange={(value) => setMinRating(value[0])}
                  className="w-full"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Flame size={16} className="text-primary" />
                  Cooking Methods
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {COOKING_METHODS.map((method) => (
                    <div key={method.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`method-${method.value}`}
                        checked={selectedCookingMethods.includes(method.value)}
                        onCheckedChange={() => toggleCookingMethod(method.value)}
                      />
                      <label
                        htmlFor={`method-${method.value}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {method.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CookingPot size={16} className="text-primary" />
                  Equipment
                </Label>
                {allEquipment.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No equipment available</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {allEquipment.map((equipment) => (
                      <div key={equipment} className="flex items-center gap-2">
                        <Checkbox
                          id={`equipment-${equipment}`}
                          checked={selectedEquipment.includes(equipment)}
                          onCheckedChange={() => toggleEquipment(equipment)}
                        />
                        <label
                          htmlFor={`equipment-${equipment}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {equipment}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Showing {sortedRecipes.length} of {recipes.length} recipes
            </p>
          </motion.div>
        </AnimatePresence>
      )}

      {sortedRecipes.length === 0 && hasActiveFilters ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <Funnel size={64} weight="duotone" className="text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No recipes match your filters</h2>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Try adjusting your filter criteria to see more recipes
          </p>
          <Button onClick={handleResetAllFilters} variant="outline" className="gap-2">
            <X size={20} />
            Clear All Filters
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedRecipes.map((recipe, index) => {
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
