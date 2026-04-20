import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feedbackApi } from '@/lib/api'
import { MealFeedback } from '@/lib/types'

export function useFeedback() {
  return useQuery({
    queryKey: ['feedback'],
    queryFn: feedbackApi.getAll,
  })
}

export function useRecipeFeedback(recipeId: string, enabled = true) {
  return useQuery({
    queryKey: ['feedback', 'recipe', recipeId],
    queryFn: () => feedbackApi.getByRecipe(recipeId),
    enabled: enabled && !!recipeId,
  })
}

export function useCreateFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (feedback: MealFeedback) => feedbackApi.create(feedback),
    onSuccess: (newFeedback) => {
      queryClient.setQueryData<MealFeedback[]>(['feedback'], (old) => [...(old || []), newFeedback])
    },
  })
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (feedback: MealFeedback) => feedbackApi.update(feedback),
    onSuccess: (updated) => {
      queryClient.setQueryData<MealFeedback[]>(['feedback'], (old) =>
        (old || []).map((f) => (f.id === updated.id ? updated : f))
      )
    },
  })
}

export function useDeleteFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => feedbackApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<MealFeedback[]>(['feedback'], (old) =>
        (old || []).filter((f) => f.id !== id)
      )
    },
  })
}
