import { useState, useRef } from 'react'
import { Event, Recipe, MealFeedback } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatCircle, Plus, Camera, X, Image as ImageIcon } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'

interface EventFeedbackProps {
  event: Event
  recipes: Recipe[]
  feedback: MealFeedback[]
  onAddFeedback: (feedback: MealFeedback) => void
}

export function EventFeedback({ event, recipes, feedback, onAddFeedback }: EventFeedbackProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedMealId, setSelectedMealId] = useState('')
  const [comments, setComments] = useState('')
  const [whatWorked, setWhatWorked] = useState('')
  const [whatToChange, setWhatToChange] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const eventFeedback = feedback.filter(f => f.eventId === event.id)

  const allMeals = event.days.flatMap((day, dayIndex) =>
    day.meals
      .filter(meal => meal.recipeId)
      .map(meal => ({
        meal,
        day: dayIndex + 1,
        recipe: recipes.find(r => r.id === meal.recipeId)
      }))
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          setPhotos(current => [...current, result])
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const handleRemovePhoto = (index: number) => {
    setPhotos(current => current.filter((_, i) => i !== index))
  }

  const handleSubmit = () => {
    const meal = allMeals.find(m => m.meal.id === selectedMealId)
    if (!meal || !meal.meal.recipeId) return

    const newFeedback: MealFeedback = {
      id: `feedback-${Date.now()}`,
      eventId: event.id,
      mealId: selectedMealId,
      recipeId: meal.meal.recipeId,
      rating: { taste: 5, difficulty: 5, portionSize: 5 },
      comments,
      whatWorked,
      whatToChange,
      photos: photos.length > 0 ? photos : undefined,
      createdAt: Date.now()
    }

    onAddFeedback(newFeedback)
    setIsDialogOpen(false)
    setSelectedMealId('')
    setComments('')
    setWhatWorked('')
    setWhatToChange('')
    setPhotos([])
  }

  if (allMeals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <ChatCircle size={64} weight="duotone" className="text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No meals to review</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Add meals with recipes to collect feedback from scouts
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Meal Feedback</h2>
          <p className="text-muted-foreground">Collect feedback to improve future meals</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus size={20} />
          Add Feedback
        </Button>
      </div>

      {eventFeedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No feedback yet for this event</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {eventFeedback.map((fb) => {
            const meal = allMeals.find(m => m.meal.id === fb.mealId)
            const recipe = recipes.find(r => r.id === fb.recipeId)

            return (
              <Card key={fb.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{recipe?.name}</CardTitle>
                  <CardDescription>
                    {format(new Date(fb.createdAt), 'MMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fb.photos && fb.photos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Photos</p>
                      <div className="grid grid-cols-2 gap-2">
                        {fb.photos.map((photo, index) => (
                          <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-muted">
                            <img 
                              src={photo} 
                              alt={`Meal photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {fb.whatWorked && (
                    <div>
                      <p className="text-sm font-medium mb-1">What Worked</p>
                      <p className="text-sm text-muted-foreground">{fb.whatWorked}</p>
                    </div>
                  )}
                  {fb.whatToChange && (
                    <div>
                      <p className="text-sm font-medium mb-1">What to Change</p>
                      <p className="text-sm text-muted-foreground">{fb.whatToChange}</p>
                    </div>
                  )}
                  {fb.comments && (
                    <div>
                      <p className="text-sm font-medium mb-1">Additional Comments</p>
                      <p className="text-sm text-muted-foreground">{fb.comments}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Meal Feedback</DialogTitle>
            <DialogDescription>
              Share feedback about a meal to help improve future events
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Select Meal</Label>
              <Select value={selectedMealId} onValueChange={setSelectedMealId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a meal" />
                </SelectTrigger>
                <SelectContent>
                  {allMeals.map(({ meal, day, recipe }) => (
                    <SelectItem key={meal.id} value={meal.id}>
                      Day {day} - {meal.type}: {recipe?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="what-worked">What Worked Well?</Label>
              <Textarea
                id="what-worked"
                placeholder="What did scouts enjoy about this meal?"
                value={whatWorked}
                onChange={(e) => setWhatWorked(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="what-to-change">What Should Be Changed?</Label>
              <Textarea
                id="what-to-change"
                placeholder="What could be improved for next time?"
                value={whatToChange}
                onChange={(e) => setWhatToChange(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comments">Additional Comments</Label>
              <Textarea
                id="comments"
                placeholder="Any other feedback?"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label>Photos of Completed Meal</Label>
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="photo-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full gap-2"
                >
                  <Camera size={20} />
                  Add Photos
                </Button>
                
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-md overflow-hidden bg-muted group">
                        <img 
                          src={photo} 
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {photos.length > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ImageIcon size={14} />
                    {photos.length} {photos.length === 1 ? 'photo' : 'photos'} added
                  </p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!selectedMealId}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
