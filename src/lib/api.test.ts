import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eventsApi, recipesApi, feedbackApi, membersApi, shareApi } from './api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }
}

function emptyResponse(status = 204) {
  return {
    ok: true,
    status,
    json: () => Promise.resolve(undefined),
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

// ── Events API ──

describe('eventsApi', () => {
  it('getPage fetches /events with pagination params', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ items: [], continuationToken: null }))
    const result = await eventsApi.getPage({ limit: 25, continuationToken: 'abc' })
    expect(result).toEqual({ items: [], continuationToken: null })
    expect(mockFetch).toHaveBeenCalledWith('/api/events?limit=25&continuationToken=abc', expect.objectContaining({
      headers: { 'Content-Type': 'application/json' },
    }))
  })

  it('getAll fetches paginated /events until completion', async () => {
    const events = [{ id: '1', name: 'Camp' }]
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ items: events, continuationToken: 'next' }))
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: '2', name: 'Hike' }], continuationToken: null }))
    const result = await eventsApi.getAll()
    expect(result).toEqual([{ id: '1', name: 'Camp' }, { id: '2', name: 'Hike' }])
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/events?limit=50', expect.objectContaining({
      headers: { 'Content-Type': 'application/json' },
    }))
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/events?limit=50&continuationToken=next', expect.anything())
  })

  it('getById fetches /events/{id}', async () => {
    const event = { id: '1', name: 'Camp' }
    mockFetch.mockResolvedValueOnce(jsonResponse(event))
    const result = await eventsApi.getById('1')
    expect(result).toEqual(event)
    expect(mockFetch).toHaveBeenCalledWith('/api/events/1', expect.anything())
  })

  it('create posts to /events', async () => {
    const event = { id: '1', name: 'Camp' } as any
    mockFetch.mockResolvedValueOnce(jsonResponse(event, 201))
    await eventsApi.create(event)
    expect(mockFetch).toHaveBeenCalledWith('/api/events', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(event),
    }))
  })

  it('update puts to /events/{id}', async () => {
    const event = { id: '1', name: 'Updated' } as any
    mockFetch.mockResolvedValueOnce(jsonResponse(event))
    await eventsApi.update(event)
    expect(mockFetch).toHaveBeenCalledWith('/api/events/1', expect.objectContaining({
      method: 'PUT',
    }))
  })

  it('delete sends DELETE to /events/{id}', async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse())
    await eventsApi.delete('1')
    expect(mockFetch).toHaveBeenCalledWith('/api/events/1', expect.objectContaining({
      method: 'DELETE',
    }))
  })

  it('togglePackedItem patches /events/{id}/packed', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: '1', packedItems: ['Skillet'] }))
    await eventsApi.togglePackedItem('1', 'Skillet', true)
    expect(mockFetch).toHaveBeenCalledWith('/api/events/1/packed', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ item: 'Skillet', packed: true }),
    }))
  })

  it('togglePurchasedItem patches /events/{id}/purchased', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: '1', purchasedItems: ['beans-can'] }))
    await eventsApi.togglePurchasedItem('1', 'beans-can', true)
    expect(mockFetch).toHaveBeenCalledWith('/api/events/1/purchased', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ item: 'beans-can', purchased: true }),
    }))
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Not found' }, 404))
    await expect(eventsApi.getById('bad')).rejects.toThrow('Not found')
  })

  it('throws using detail field on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ detail: 'Shared event not found' }, 404))
    await expect(eventsApi.getById('bad')).rejects.toThrow('Shared event not found')
  })

  it('regenerateShare posts to /events/{id}/share', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ shareToken: 't', shareUrl: 'https://example.com/share/t' }))
    await eventsApi.regenerateShare('1')
    expect(mockFetch).toHaveBeenCalledWith('/api/events/1/share', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('revokeShare sends DELETE to /events/{id}/share', async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse())
    await eventsApi.revokeShare('1')
    expect(mockFetch).toHaveBeenCalledWith('/api/events/1/share', expect.objectContaining({
      method: 'DELETE',
    }))
  })

  it('emailShoppingList posts to /events/{id}/shopping-list/email', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ message: 'sent' }, 202))
    const payload = {
      recipientEmail: 'parent@example.com',
      items: [{ name: 'Beans', quantity: 2, unit: 'can' }],
    }
    await eventsApi.emailShoppingList('1', payload)
    expect(mockFetch).toHaveBeenCalledWith('/api/events/1/shopping-list/email', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
    }))
  })
})

// ── Recipes API ──

describe('recipesApi', () => {
  it('getPage fetches /recipes with pagination params', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ items: [], continuationToken: null }))
    const result = await recipesApi.getPage({ limit: 10, continuationToken: 'next' })
    expect(result).toEqual({ items: [], continuationToken: null })
    expect(mockFetch).toHaveBeenCalledWith('/api/recipes?limit=10&continuationToken=next', expect.anything())
  })

  it('getAll fetches paginated /recipes', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 'r1' }], continuationToken: 'next' }))
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 'r2' }], continuationToken: null }))
    const result = await recipesApi.getAll()
    expect(result).toEqual([{ id: 'r1' }, { id: 'r2' }])
  })

  it('create posts to /recipes', async () => {
    const recipe = { id: '1', name: 'Pancakes' } as any
    mockFetch.mockResolvedValueOnce(jsonResponse(recipe, 201))
    await recipesApi.create(recipe)
    expect(mockFetch).toHaveBeenCalledWith('/api/recipes', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('delete sends DELETE to /recipes/{id}', async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse())
    await recipesApi.delete('1')
    expect(mockFetch).toHaveBeenCalledWith('/api/recipes/1', expect.objectContaining({
      method: 'DELETE',
    }))
  })
})

// ── Feedback API ──

describe('feedbackApi', () => {
  it('getAll fetches paginated /feedback', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 'f1' }], continuationToken: 'next' }))
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 'f2' }], continuationToken: null }))
    const result = await feedbackApi.getAll()
    expect(result).toEqual([{ id: 'f1' }, { id: 'f2' }])
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/feedback?limit=50', expect.anything())
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/feedback?limit=50&continuationToken=next', expect.anything())
  })

  it('getByEvent fetches /feedback/event/{eventId}', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]))
    const result = await feedbackApi.getByEvent('ev-1')
    expect(result).toEqual([])
    expect(mockFetch).toHaveBeenCalledWith('/api/feedback/event/ev-1', expect.anything())
  })

  it('getByRecipe fetches /feedback/recipe/{recipeId}', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]))
    const result = await feedbackApi.getByRecipe('recipe-1')
    expect(result).toEqual([])
    expect(mockFetch).toHaveBeenCalledWith('/api/feedback/recipe/recipe-1', expect.anything())
  })

  it('delete sends DELETE to /feedback/{id}', async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse())
    await feedbackApi.delete('fb-1')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/feedback/fb-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('membersApi', () => {
  it('getAll fetches paginated /members', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 'm1' }], continuationToken: 'next' }))
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: 'm2' }], continuationToken: null }))
    const result = await membersApi.getAll()
    expect(result).toEqual([{ id: 'm1' }, { id: 'm2' }])
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/members?limit=50', expect.anything())
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/members?limit=50&continuationToken=next', expect.anything())
  })

  it('create posts to /members', async () => {
    const member = { displayName: 'New Member', email: 'new@example.com', role: 'scout' }
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'm1', ...member }, 201))
    await membersApi.create(member)
    expect(mockFetch).toHaveBeenCalledWith('/api/members', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(member),
    }))
  })

  it('deleteData sends DELETE to /members/{id}/data', async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse())
    await membersApi.deleteData('member-1')
    expect(mockFetch).toHaveBeenCalledWith('/api/members/member-1/data', expect.objectContaining({
      method: 'DELETE',
    }))
  })

  it('updateStatus patches /troops/{troopId}/members/{id}', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ id: 'member-1', status: 'removed' }))
    await membersApi.updateStatus('troop-1', 'member-1', 'removed')
    expect(mockFetch).toHaveBeenCalledWith('/api/troops/troop-1/members/member-1', expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ status: 'removed' }),
    }))
  })
})

describe('shareApi', () => {
  it('getByToken fetches /share/{token}', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ event: { id: 'e1' }, recipes: [] }))
    await shareApi.getByToken('token-1')
    expect(mockFetch).toHaveBeenCalledWith('/api/share/token-1', expect.anything())
  })
})
