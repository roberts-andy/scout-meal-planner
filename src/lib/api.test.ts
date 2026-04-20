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
  it('getAll fetches /events', async () => {
    const events = [{ id: '1', name: 'Camp' }]
    mockFetch.mockResolvedValueOnce(jsonResponse(events))
    const result = await eventsApi.getAll()
    expect(result).toEqual(events)
    expect(mockFetch).toHaveBeenCalledWith('/api/events', expect.objectContaining({
      headers: { 'Content-Type': 'application/json' },
    }))
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
  it('getAll fetches /recipes', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]))
    const result = await recipesApi.getAll()
    expect(result).toEqual([])
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

  it('delete includes eventId as query param', async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse())
    await feedbackApi.delete('fb-1', 'ev-1')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/feedback/fb-1?eventId=ev-1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('delete encodes eventId in query param', async () => {
    mockFetch.mockResolvedValueOnce(emptyResponse())
    await feedbackApi.delete('fb-1', 'ev with spaces')
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/feedback/fb-1?eventId=ev%20with%20spaces',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('membersApi', () => {
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
