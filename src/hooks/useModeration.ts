import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { moderationApi } from '@/lib/api'
import type { FlaggedItem } from '@/lib/types'

export function useFlaggedContent() {
  return useQuery({
    queryKey: ['moderation', 'flagged'],
    queryFn: moderationApi.getFlagged,
  })
}

export function useReviewContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) =>
      moderationApi.review(id, action),
    onSuccess: (reviewed) => {
      queryClient.setQueryData<FlaggedItem[]>(['moderation', 'flagged'], (old) =>
        (old || []).filter((item) => item.id !== reviewed.id)
      )
    },
  })
}
