import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recipesApi } from '@/lib/api'
import { Recipe } from '@/lib/types'

const PAGE_SIZE = 50

export function useRecipes() {
  const query = useInfiniteQuery({
    queryKey: ['recipes'],
    queryFn: ({ pageParam }) => recipesApi.getPage({ limit: PAGE_SIZE, continuationToken: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.continuationToken ?? undefined,
  })

  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.items) ?? [],
  }
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recipe: Recipe) => recipesApi.create(recipe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (recipe: Recipe) => recipesApi.update(recipe),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recipesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
