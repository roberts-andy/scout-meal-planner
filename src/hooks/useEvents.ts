import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi } from '@/lib/api'
import { Event } from '@/lib/types'

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (event: Event) => eventsApi.create(event),
    onSuccess: (newEvent) => {
      queryClient.setQueryData<Event[]>(['events'], (old) => [...(old || []), newEvent])
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (event: Event) => eventsApi.update(event),
    onSuccess: (updated) => {
      queryClient.setQueryData<Event[]>(['events'], (old) =>
        (old || []).map((e) => (e.id === updated.id ? updated : e))
      )
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<Event[]>(['events'], (old) =>
        (old || []).filter((e) => e.id !== id)
      )
    },
  })
}
