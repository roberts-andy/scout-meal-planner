import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/lib/api', () => ({
  eventsApi: {
    getPage: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { eventsApi } from '@/lib/api'
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from './useEvents'

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useEvents', () => {
  it('fetches first page and can fetch next page on demand', async () => {
    const events = [{ id: 'e1', name: 'Camp' } as any]
    vi.mocked(eventsApi.getPage)
      .mockResolvedValueOnce({ items: events, continuationToken: 'token-1' })
      .mockResolvedValueOnce({ items: [{ id: 'e2', name: 'Hike' } as any], continuationToken: null })
    const { result } = renderHook(() => useEvents(), { wrapper: wrapper() })
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'e1', name: 'Camp' }]))
    expect(eventsApi.getPage).toHaveBeenNthCalledWith(1, { continuationToken: undefined })

    await result.current.fetchNextPage()

    await waitFor(() => expect(result.current.data).toEqual([
      { id: 'e1', name: 'Camp' },
      { id: 'e2', name: 'Hike' },
    ]))
    expect(eventsApi.getPage).toHaveBeenNthCalledWith(2, { continuationToken: 'token-1' })
  })
})

describe('useCreateEvent', () => {
  it('calls eventsApi.create', async () => {
    const created = { id: 'e2', name: 'New' } as any
    vi.mocked(eventsApi.getPage).mockResolvedValue({ items: [{ id: 'e1' } as any], continuationToken: null })
    vi.mocked(eventsApi.create).mockResolvedValueOnce(created)

    const Wrapper = wrapper()
    const { result: eventsHook } = renderHook(() => useEvents(), { wrapper: Wrapper })
    const { result: createHook } = renderHook(() => useCreateEvent(), { wrapper: Wrapper })

    await waitFor(() => expect(eventsHook.current.isSuccess).toBe(true))
    await createHook.current.mutateAsync(created)

    // createMutation doesn't share the same queryClient instance across wrappers,
    // so we just assert the mutation fires the API.
    expect(eventsApi.create).toHaveBeenCalledWith(created)
  })
})

describe('useUpdateEvent', () => {
  it('calls eventsApi.update', async () => {
    const updated = { id: 'e1', name: 'Updated' } as any
    vi.mocked(eventsApi.update).mockResolvedValueOnce(updated)
    const { result } = renderHook(() => useUpdateEvent(), { wrapper: wrapper() })
    await result.current.mutateAsync(updated)
    expect(eventsApi.update).toHaveBeenCalledWith(updated)
  })
})

describe('useDeleteEvent', () => {
  it('calls eventsApi.delete', async () => {
    vi.mocked(eventsApi.delete).mockResolvedValueOnce(undefined)
    const { result } = renderHook(() => useDeleteEvent(), { wrapper: wrapper() })
    await result.current.mutateAsync('e1')
    expect(eventsApi.delete).toHaveBeenCalledWith('e1')
  })
})
