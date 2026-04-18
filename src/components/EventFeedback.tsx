import { useState, useRef } from 'react'
import { Event, Recipe, MealFeedback, FeedbackRating } from '@/lib/types'
import { hasEventEnded } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatCircle, Plus, Camera, X, Image as ImageIcon, User, PencilSimple, Trash, ClockCounterClockwise, Clock } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarRating } from '@/components/StarRating'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

interface EventFeedbackProps {
  event: Event
  recipes: Recipe[]
  feedback: MealFeedback[]
  onAddFeedback: (feedback: MealFeedback) => void
  onUpdateFeedback: (feedback: MealFeedback) => void
  onDeleteFeedback: (feedbackId: string) => void
}

export function EventFeedback({ event, recipes, feedback, onAddFeedback, onUpdateFeedback, onDeleteFeedback }: EventFeedbackProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFeedback, setEditingFeedback] = useState<MealFeedback | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [selectedMealId, setSelectedMealId] = useState('')
  const [scoutName, setScoutName] = useState('')
  const [comments, setComments] = useState('')
  const [whatWorked, setWhatWorked] = useState('')
  const [whatToChange, setWhatToChange] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [ratings, setRatings] = useState<FeedbackRating>({
    taste: 0,
    difficulty: 0,
    portionSize: 0
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const feedbackEnabled = hasEventEnded(event)
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

  const handleOpenDialog = (feedbackToEdit?: MealFeedback) => {
    if (feedbackToEdit) {
      setEditingFeedback(feedbackToEdit)
      setSelectedMealId(feedbackToEdit.mealId)
      setScoutName(feedbackToEdit.scoutName || '')
      setComments(feedbackToEdit.comments)
      setWhatWorked(feedbackToEdit.whatWorked)
      setWhatToChange(feedbackToEdit.whatToChange)
      setPhotos(feedbackToEdit.photos || [])
      setRatings(feedbackToEdit.rating)
    } else {
      setEditingFeedback(null)
      setSelectedMealId('')
      setScoutName('')
      setComments('')
      setWhatWorked('')
      setWhatToChange('')
      setPhotos([])
      setRatings({ taste: 0, difficulty: 0, portionSize: 0 })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingFeedback(null)
    setSelectedMealId('')
    setScoutName('')
    setComments('')
    setWhatWorked('')
    setWhatToChange('')
    setPhotos([])
    setRatings({ taste: 0, difficulty: 0, portionSize: 0 })
  }

  const handleSubmit = () => {
    const meal = allMeals.find(m => m.meal.id === selectedMealId)
    if (!meal || !meal.meal.recipeId) return

    if (editingFeedback) {
      const updatedFeedback: MealFeedback = {
        ...editingFeedback,
        mealId: selectedMealId,
        recipeId: meal.meal.recipeId,
        scoutName: scoutName || undefined,
        rating: ratings,
        comments,
        whatWorked,
        whatToChange,
        photos: photos.length > 0 ? photos : undefined,
        updatedAt: Date.now()
      }
      onUpdateFeedback(updatedFeedback)
    } else {
      const newFeedback: MealFeedback = {
        id: `feedback-${Date.now()}`,
        eventId: event.id,
        mealId: selectedMealId,
        recipeId: meal.meal.recipeId,
        scoutName: scoutName || undefined,
        rating: ratings,
        comments,
        whatWorked,
        whatToChange,
        photos: photos.length > 0 ? photos : undefined,
        createdAt: Date.now()
      }
      onAddFeedback(newFeedback)
    }

    handleCloseDialog()
  }

  const handleDelete = (feedbackId: string) => {
    onDeleteFeedback(feedbackId)
    setDeleteConfirmId(null)
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
        <Button onClick={() => handleOpenDialog()} className="gap-2" disabled={!feedbackEnabled}>
          <Plus size={20} />
          Add Feedback
        </Button>
      </div>

      {!feedbackEnabled && (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-4">
            <Clock size={20} className="text-muted-foreground flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Feedback can be submitted once the event has ended ({event.endDate}).
            </p>
          </CardContent>
        </Card>
      )}

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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{recipe?.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 flex-wrap">
                        {fb.scoutName && (
                          <>
                            <span className="flex items-center gap-1">
                              <User size={14} />
                              {fb.scoutName}
                            </span>
                            <span className="text-muted-foreground">•</span>
                          </>
                        )}
                        <span>{format(new Date(fb.createdAt), 'MMM d, yyyy')}</span>
                        {fb.updatedAt && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <Badge variant="outline" className="gap-1 font-normal">
                              <ClockCounterClockwise size={12} />
                              Edited {format(new Date(fb.updatedAt), 'MMM d, h:mm a')}
                            </Badge>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(fb)}
                        className="h-8 w-8 p-0"
                      >
                        <PencilSimple size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(fb.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Taste</p>
                      <StarRating value={fb.rating.taste} readonly size={16} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Difficulty</p>
                      <StarRating value={fb.rating.difficulty} readonly size={16} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Portion Size</p>
                      <StarRating value={fb.rating.portionSize} readonly size={16} />
                    </div>
                  </div>
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

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingFeedback ? 'Edit Meal Feedback' : 'Add Meal Feedback'}</DialogTitle>
            <DialogDescription>
              {editingFeedback ? 'Update your feedback about this meal' : 'Share feedback about a meal to help improve future events'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="scout-name">Scout Name (Optional)</Label>
              <Input
                id="scout-name"
                placeholder="Who is providing this feedback?"
                value={scoutName}
                onChange={(e) => setScoutName(e.target.value)}
              />
            </div>

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

            <div className="grid gap-4">
              <div className="space-y-3">
                <div>
                  <Label className="mb-2 block">Taste</Label>
                  <StarRating
                    value={ratings.taste}
                    onChange={(value) => setRatings(prev => ({ ...prev, taste: value }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Difficulty</Label>
                  <StarRating
                    value={ratings.difficulty}
                    onChange={(value) => setRatings(prev => ({ ...prev, difficulty: value }))}
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Portion Size</Label>
                  <StarRating
                    value={ratings.portionSize}
                    onChange={(value) => setRatings(prev => ({ ...prev, portionSize: value }))}
                  />
                </div>
              </div>
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
                  aria-label="Upload photos of completed meal"
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
                          title={`Remove photo ${index + 1}`}
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
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedMealId || (ratings.taste === 0 && ratings.difficulty === 0 && ratings.portionSize === 0)}
            >
              {editingFeedback ? 'Update Feedback' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feedback</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this feedback? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
