import { useState, useEffect } from 'react'
import { Recipe, Ingredient, RecipeVariation, IngredientUnit, CookingMethod } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash } from '@phosphor-icons/react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface CreateRecipeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateRecipe: (recipe: Recipe) => void
  initialRecipe?: Recipe
  eventId?: string
  eventName?: string
  isEventActive?: boolean
}

export function CreateRecipeDialog({ open, onOpenChange, onCreateRecipe, initialRecipe, eventId, eventName, isEventActive }: CreateRecipeDialogProps) {
  const [name, setName] = useState(initialRecipe?.name || '')
  const [description, setDescription] = useState(initialRecipe?.description || '')
  const [servings, setServings] = useState(initialRecipe?.servings || 4)
  const [ingredients, setIngredients] = useState<Ingredient[]>(initialRecipe?.ingredients || [])
  const [variations, setVariations] = useState<RecipeVariation[]>(initialRecipe?.variations || [{
    id: `var-${Date.now()}`,
    cookingMethod: 'camp-stove',
    instructions: [''],
    equipment: [''],
  }])
  const [changeNote, setChangeNote] = useState('')

  useEffect(() => {
    if (initialRecipe) {
      setName(initialRecipe.name)
      setDescription(initialRecipe.description || '')
      setServings(initialRecipe.servings)
      setIngredients(initialRecipe.ingredients)
      setVariations(initialRecipe.variations)
      setChangeNote('')
    }
  }, [initialRecipe])

  const isEditing = !!initialRecipe
  const isEditingInTrip = isEditing && !!eventId

  const addIngredient = () => {
    setIngredients([...ingredients, {
      id: `ing-${Date.now()}`,
      name: '',
      quantity: 1,
      unit: 'cup'
    }])
  }

  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateVariationInstructions = (varIndex: number, instIndex: number, value: string) => {
    const updated = [...variations]
    updated[varIndex].instructions[instIndex] = value
    setVariations(updated)
  }

  const addVariationInstruction = (varIndex: number) => {
    const updated = [...variations]
    updated[varIndex].instructions.push('')
    setVariations(updated)
  }

  const updateVariationEquipment = (varIndex: number, eqIndex: number, value: string) => {
    const updated = [...variations]
    updated[varIndex].equipment[eqIndex] = value
    setVariations(updated)
  }

  const addVariationEquipment = (varIndex: number) => {
    const updated = [...variations]
    updated[varIndex].equipment.push('')
    setVariations(updated)
  }

  const updateVariationMethod = (varIndex: number, method: CookingMethod) => {
    const updated = [...variations]
    updated[varIndex].cookingMethod = method
    setVariations(updated)
  }

  const handleSubmit = () => {
    if (!name || ingredients.length === 0) return

    const filteredIngredients = ingredients.filter(ing => ing.name.trim())
    const filteredVariations = variations.map(v => ({
      ...v,
      instructions: v.instructions.filter(i => i.trim()),
      equipment: v.equipment.filter(e => e.trim())
    })).filter(v => v.instructions.length > 0)

    if (isEditingInTrip && initialRecipe && eventId) {
      const existingEventVersion = initialRecipe.versions.find(v => v.eventId === eventId)
      
      if (existingEventVersion) {
        const updatedVersions = initialRecipe.versions.map(v => 
          v.eventId === eventId
            ? {
                ...v,
                name,
                description: description || undefined,
                servings,
                ingredients: filteredIngredients,
                variations: filteredVariations,
                createdAt: Date.now(),
                changeNote: changeNote || v.changeNote,
              }
            : v
        )

        const recipe: Recipe = {
          ...initialRecipe,
          name,
          description: description || undefined,
          servings,
          ingredients: filteredIngredients,
          variations: filteredVariations,
          updatedAt: Date.now(),
          versions: updatedVersions,
        }

        onCreateRecipe(recipe)
      } else {
        const currentVersion = initialRecipe.currentVersion || 1
        const newVersion = currentVersion + 1
        
        const eventVersion = {
          versionNumber: newVersion,
          eventId,
          eventName,
          name,
          description: description || undefined,
          servings,
          ingredients: filteredIngredients,
          variations: filteredVariations,
          createdAt: Date.now(),
          changeNote: changeNote || `Modified for ${eventName}`,
        }

        const recipe: Recipe = {
          ...initialRecipe,
          name,
          description: description || undefined,
          servings,
          ingredients: filteredIngredients,
          variations: filteredVariations,
          updatedAt: Date.now(),
          currentVersion: newVersion,
          versions: [...(initialRecipe.versions || []), eventVersion],
        }

        onCreateRecipe(recipe)
      }
    } else if (isEditing && initialRecipe) {
      const currentVersion = initialRecipe.currentVersion || 1
      const newVersion = currentVersion + 1
      
      const previousVersion = {
        versionNumber: currentVersion,
        name: initialRecipe.name,
        description: initialRecipe.description,
        servings: initialRecipe.servings,
        ingredients: initialRecipe.ingredients,
        variations: initialRecipe.variations,
        tags: initialRecipe.tags,
        createdAt: initialRecipe.updatedAt,
        changeNote,
      }

      const recipe: Recipe = {
        ...initialRecipe,
        name,
        description: description || undefined,
        servings,
        ingredients: filteredIngredients,
        variations: filteredVariations,
        updatedAt: Date.now(),
        currentVersion: newVersion,
        versions: [...(initialRecipe.versions || []), previousVersion],
      }

      onCreateRecipe(recipe)
    } else {
      const recipe: Recipe = {
        id: `recipe-${Date.now()}`,
        troopId: '',
        name,
        description: description || undefined,
        servings,
        ingredients: filteredIngredients,
        variations: filteredVariations,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        currentVersion: 1,
        versions: [],
      }

      onCreateRecipe(recipe)
    }
    
    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setServings(4)
    setIngredients([])
    setVariations([{
      id: `var-${Date.now()}`,
      cookingMethod: 'camp-stove',
      instructions: [''],
      equipment: [''],
    }])
    setChangeNote('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Recipe' : 'Create New Recipe'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your recipe details, ingredients, and cooking instructions' 
              : 'Add a new recipe to your library with ingredients, cooking instructions, and equipment needs'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="recipe-name">Recipe Name</Label>
              <Input
                id="recipe-name"
                placeholder="e.g., Campfire Chili"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the recipe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value) || 1)}
              />
            </div>

            {isEditing && (
              <div className="grid gap-2">
                <Label htmlFor="change-note">Change Note (Optional)</Label>
                <Textarea
                  id="change-note"
                  placeholder="Describe what you changed in this version..."
                  value={changeNote}
                  onChange={(e) => setChangeNote(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <Separator />

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Ingredients</Label>
                <Button type="button" size="sm" variant="outline" onClick={addIngredient} className="gap-1">
                  <Plus size={16} />
                  Add
                </Button>
              </div>
              {ingredients.map((ing, index) => (
                <div key={ing.id} className="flex gap-2 items-start">
                  <Input
                    placeholder="Ingredient name"
                    value={ing.name}
                    onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    placeholder="Qty"
                    value={ing.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-20"
                  />
                  <Select value={ing.unit} onValueChange={(value) => updateIngredient(index, 'unit', value as IngredientUnit)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cup">cup</SelectItem>
                      <SelectItem value="tbsp">tbsp</SelectItem>
                      <SelectItem value="tsp">tsp</SelectItem>
                      <SelectItem value="oz">oz</SelectItem>
                      <SelectItem value="lb">lb</SelectItem>
                      <SelectItem value="g">g</SelectItem>
                      <SelectItem value="whole">whole</SelectItem>
                      <SelectItem value="can">can</SelectItem>
                      <SelectItem value="package">pkg</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeIngredient(index)}
                  >
                    <Trash size={16} className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            <div className="grid gap-4">
              <Label>Cooking Variation</Label>
              {variations.map((variation, varIndex) => (
                <div key={variation.id} className="border rounded-lg p-4 space-y-3">
                  <div className="grid gap-2">
                    <Label>Cooking Method</Label>
                    <Select 
                      value={variation.cookingMethod} 
                      onValueChange={(value) => updateVariationMethod(varIndex, value as CookingMethod)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="camp-stove">Camp Stove</SelectItem>
                        <SelectItem value="open-fire">Open Fire</SelectItem>
                        <SelectItem value="dutch-oven">Dutch Oven</SelectItem>
                        <SelectItem value="skillet">Skillet</SelectItem>
                        <SelectItem value="grill">Grill</SelectItem>
                        <SelectItem value="no-cook">No Cook</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Instructions</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addVariationInstruction(varIndex)}
                        className="gap-1 h-7 text-xs"
                      >
                        <Plus size={14} />
                        Step
                      </Button>
                    </div>
                    {variation.instructions.map((instruction, instIndex) => (
                      <Input
                        key={instIndex}
                        placeholder={`Step ${instIndex + 1}`}
                        value={instruction}
                        onChange={(e) => updateVariationInstructions(varIndex, instIndex, e.target.value)}
                      />
                    ))}
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Equipment Needed</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => addVariationEquipment(varIndex)}
                        className="gap-1 h-7 text-xs"
                      >
                        <Plus size={14} />
                        Item
                      </Button>
                    </div>
                    {variation.equipment.map((eq, eqIndex) => (
                      <Input
                        key={eqIndex}
                        placeholder="Equipment item"
                        value={eq}
                        onChange={(e) => updateVariationEquipment(varIndex, eqIndex, e.target.value)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || ingredients.length === 0}>
            {isEditing ? 'Save Changes' : 'Create Recipe'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
