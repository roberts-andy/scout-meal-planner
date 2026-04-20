import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '@/lib/api'
import { Event } from '@/lib/types'

const PAGE_SIZE = 50

export function useEvents() {
  const query = useInfiniteQuery({
    queryKey: ['events'],
    queryFn: ({ pageParam }) => eventsApi.getPage({ limit: PAGE_SIZE, continuationToken: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.continuationToken ?? undefined,
  })

  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.items) ?? [],
  }
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (event: Event) => eventsApi.create(event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (event: Event) => eventsApi.update(event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
