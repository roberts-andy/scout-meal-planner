import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recipesApi } from '@/lib/api'
import { Recipe } from '@/lib/types'

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: recipesApi.getAll,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recipe: Recipe) => recipesApi.create(recipe),
    onSuccess: (newRecipe) => {
      queryClient.setQueryData<Recipe[]>(['recipes'], (old) => [...(old || []), newRecipe])
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recipe: Recipe) => recipesApi.update(recipe),
    onSuccess: (updated) => {
      queryClient.setQueryData<Recipe[]>(['recipes'], (old) =>
        (old || []).map((r) => (r.id === updated.id ? updated : r))
      )
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recipesApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Recipe[]>(['recipes'], (old) =>
        (old || []).filter((r) => r.id !== id)
      )
    },
  })
}
