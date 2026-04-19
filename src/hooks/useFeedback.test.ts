import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/lib/api', () => ({
  feedbackApi: {
    getAll: vi.fn(),
    getByRecipe: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { feedbackApi } from '@/lib/api'
import { useRecipeFeedback } from './useFeedback'

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useRecipeFeedback', () => {
  it('fetches recipe feedback via feedbackApi.getByRecipe', async () => {
    const feedback = [{ id: 'fb-1', recipeId: 'recipe-1' }] as any
    vi.mocked(feedbackApi.getByRecipe).mockResolvedValueOnce(feedback)

    const { result } = renderHook(() => useRecipeFeedback('recipe-1'), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(feedback)
    expect(feedbackApi.getByRecipe).toHaveBeenCalledWith('recipe-1')
  })
})
