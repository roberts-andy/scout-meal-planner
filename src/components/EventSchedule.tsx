import { useState } from 'react'
import { Event, Recipe, Meal, MealType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash, Users, Minus } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

interface EventScheduleProps {
  event: Event
  recipes: Recipe[]
  onUpdateEvent: (event: Event) => void
}

export function EventSchedule({ event, recipes, onUpdateEvent }: EventScheduleProps) {
  const [isAddMealOpen, setIsAddMealOpen] = useState(false)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [recipeId, setRecipeId] = useState<string>('')
  const [scoutCount, setScoutCount] = useState(8)

  const handleAddMeal = () => {
    if (selectedDayIndex === null) return

    const newMeal: Meal = {
      id: `meal-${Date.now()}`,
      type: mealType,
      recipeId: recipeId || undefined,
      scoutCount,
      selectedVariationId: undefined
    }

    const updated = { ...event }
    updated.days[selectedDayIndex].meals.push(newMeal)
    updated.updatedAt = Date.now()
    onUpdateEvent(updated)
    setIsAddMealOpen(false)
    setSelectedDayIndex(null)
    setRecipeId('')
  }

  const handleDeleteMeal = (dayIndex: number, mealId: string) => {
    const updated = { ...event }
    updated.days[dayIndex].meals = updated.days[dayIndex].meals.filter(m => m.id !== mealId)
    updated.updatedAt = Date.now()
    onUpdateEvent(updated)
  }

  const handleUpdateScoutCount = (dayIndex: number, mealId: string, change: number) => {
    const updated = { ...event }
    const meal = updated.days[dayIndex].meals.find(m => m.id === mealId)
    if (meal) {
      meal.scoutCount = Math.max(1, meal.scoutCount + change)
      updated.updatedAt = Date.now()
      onUpdateEvent(updated)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Meal Schedule</h2>
        <p className="text-muted-foreground">Plan meals for each day of your event</p>
      </div>

      <div className="space-y-6">
        {event.days.map((day, dayIndex) => (
          <Card key={day.date}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Day {dayIndex + 1}</CardTitle>
                  <CardDescription>{format(new Date(day.date), 'EEEE, MMMM d')}</CardDescription>
                </div>
                <Button
                  onClick={() => {
                    setSelectedDayIndex(dayIndex)
                    setIsAddMealOpen(true)
                  }}
                  size="sm"
                  className="gap-1"
                >
                  <Plus size={16} />
                  Add Meal
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {day.meals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No meals planned for this day</p>
              ) : (
                <div className="space-y-3">
                  {day.meals.map((meal) => {
                    const recipe = meal.recipeId ? recipes.find(r => r.id === meal.recipeId) : null
                    return (
                      <div
                        key={meal.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="capitalize">
                              {meal.type}
                            </Badge>
                            {recipe && <span className="font-medium">{recipe.name}</span>}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleUpdateScoutCount(dayIndex, meal.id, -1)}
                              >
                                <Minus size={14} />
                              </Button>
                              <Users size={16} />
                              <span>{meal.scoutCount} scouts</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleUpdateScoutCount(dayIndex, meal.id, 1)}
                              >
                                <Plus size={14} />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteMeal(dayIndex, meal.id)}
                        >
                          <Trash size={18} className="text-destructive" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Meal</DialogTitle>
            <DialogDescription>
              Plan a meal for Day {selectedDayIndex !== null && selectedDayIndex + 1}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Meal Type</Label>
              <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Recipe (Optional)</Label>
              <Select value={recipeId} onValueChange={setRecipeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a recipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No recipe</SelectItem>
                  {recipes.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Number of Scouts</Label>
              <Input
                type="number"
                min={1}
                value={scoutCount}
                onChange={(e) => setScoutCount(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMealOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMeal}>Add Meal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
