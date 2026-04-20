import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/lib/api', () => ({
  recipesApi: {
    getPage: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { recipesApi } from '@/lib/api'
import { useRecipes, useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from './useRecipes'

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useRecipes', () => {
  it('fetches and flattens paginated recipes via recipesApi.getPage', async () => {
    vi.mocked(recipesApi.getPage)
      .mockResolvedValueOnce({ items: [{ id: 'r1', name: 'Pancakes' } as any], continuationToken: 'token-1' })
      .mockResolvedValueOnce({ items: [{ id: 'r2', name: 'Chili' } as any], continuationToken: null })

    const { result } = renderHook(() => useRecipes(), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.data).toEqual([
      { id: 'r1', name: 'Pancakes' },
      { id: 'r2', name: 'Chili' },
    ]))
    expect(recipesApi.getPage).toHaveBeenNthCalledWith(1, { limit: 50, continuationToken: undefined })
    expect(recipesApi.getPage).toHaveBeenNthCalledWith(2, { limit: 50, continuationToken: 'token-1' })
  })
})

describe('useCreateRecipe', () => {
  it('calls recipesApi.create', async () => {
    const recipe = { id: 'r1', name: 'Pancakes' } as any
    vi.mocked(recipesApi.create).mockResolvedValueOnce(recipe)
    const { result } = renderHook(() => useCreateRecipe(), { wrapper: wrapper() })
    await result.current.mutateAsync(recipe)
    expect(recipesApi.create).toHaveBeenCalledWith(recipe)
  })
})

describe('useUpdateRecipe', () => {
  it('calls recipesApi.update', async () => {
    const recipe = { id: 'r1', name: 'Updated' } as any
    vi.mocked(recipesApi.update).mockResolvedValueOnce(recipe)
    const { result } = renderHook(() => useUpdateRecipe(), { wrapper: wrapper() })
    await result.current.mutateAsync(recipe)
    expect(recipesApi.update).toHaveBeenCalledWith(recipe)
  })
})

describe('useDeleteRecipe', () => {
  it('calls recipesApi.delete', async () => {
    vi.mocked(recipesApi.delete).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useDeleteRecipe(), { wrapper: wrapper() })
    await result.current.mutateAsync('r1')
    expect(recipesApi.delete).toHaveBeenCalledWith('r1')
  })
})
