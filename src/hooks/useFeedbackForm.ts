import { useState, useRef } from 'react'
import { Event, Recipe, MealFeedback, FeedbackRating } from '@/lib/types'

const EMPTY_RATINGS: FeedbackRating = { taste: 0, difficulty: 0, portionSize: 0 }

export function useFeedbackForm(
  event: Event,
  recipes: Recipe[],
  onAddFeedback: (feedback: MealFeedback) => void,
  onUpdateFeedback: (feedback: MealFeedback) => void,
) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFeedback, setEditingFeedback] = useState<MealFeedback | null>(null)
  const [selectedMealId, setSelectedMealId] = useState('')
  const [scoutName, setScoutName] = useState('')
  const [comments, setComments] = useState('')
  const [whatWorked, setWhatWorked] = useState('')
  const [whatToChange, setWhatToChange] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [ratings, setRatings] = useState<FeedbackRating>(EMPTY_RATINGS)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const resetFields = () => {
    setEditingFeedback(null)
    setSelectedMealId('')
    setScoutName('')
    setComments('')
    setWhatWorked('')
    setWhatToChange('')
    setPhotos([])
    setRatings(EMPTY_RATINGS)
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
      resetFields()
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    resetFields()
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
        troopId: event.troopId,
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

  const canSubmit = selectedMealId !== '' && (ratings.taste > 0 || ratings.difficulty > 0 || ratings.portionSize > 0)

  return {
    // Dialog
    isDialogOpen,
    editingFeedback,
    handleOpenDialog,
    handleCloseDialog,
    handleSubmit,
    canSubmit,
    // Fields
    selectedMealId,
    setSelectedMealId,
    scoutName,
    setScoutName,
    comments,
    setComments,
    whatWorked,
    setWhatWorked,
    whatToChange,
    setWhatToChange,
    photos,
    ratings,
    setRatings,
    // Photos
    fileInputRef,
    handleFileChange,
    handleRemovePhoto,
    // Derived
    allMeals,
  }
}
