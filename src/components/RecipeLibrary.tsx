import { useState } from 'react'
import { Recipe } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, CookingPot, Trash, Pencil, Users, Flame, Copy } from '@phosphor-icons/react'
import { CreateRecipeDialog } from './CreateRecipeDialog'
import { RecipeDetailDialog } from './RecipeDetailDialog'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface RecipeLibraryProps {
  recipes: Recipe[]
  onCreateRecipe: (recipe: Recipe) => void
  onUpdateRecipe: (recipe: Recipe) => void
  onDeleteRecipe: (recipeId: string) => void
}

export function RecipeLibrary({ recipes, onCreateRecipe, onUpdateRecipe, onDeleteRecipe }: RecipeLibraryProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

  const handleCloneRecipe = (recipe: Recipe, e: React.MouseEvent) => {
    e.stopPropagation()
    const clonedRecipe: Recipe = {
      ...recipe,
      id: `recipe-${Date.now()}`,
      name: `${recipe.name} (Copy)`,
      clonedFrom: recipe.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    onCreateRecipe(clonedRecipe)
    toast.success(`Cloned "${recipe.name}"`)
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Recipe Library</h2>
          <p className="text-muted-foreground mt-1">Your collection of scout-tested recipes</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
          <Plus size={20} />
          New Recipe
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe, index) => (
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
                <div className="flex flex-wrap gap-2 mb-3">
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
        ))}
      </div>

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
          open={!!selectedRecipe}
          onOpenChange={(open) => !open && setSelectedRecipe(null)}
          onUpdateRecipe={onUpdateRecipe}
        />
      )}
    </div>
  )
}
