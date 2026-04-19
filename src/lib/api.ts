import type { Event, Recipe, MealFeedback, Troop, TroopMember } from './types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

/** Token provider — set by AuthProvider at startup */
let _getAccessToken: (() => Promise<string>) | null = null

export function setTokenProvider(fn: () => Promise<string>) {
  _getAccessToken = fn
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (_getAccessToken) {
    const token = await _getAccessToken()
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const details = body.details && typeof body.details === 'object'
      ? Object.entries(body.details as Record<string, unknown>)
        .flatMap(([field, messages]) =>
          Array.isArray(messages)
            ? messages.map((message) => `${field}: ${String(message)}`)
            : [`${field}: ${String(messages)}`]
        )
        .join(', ')
      : ''
    const detail = body.error
      ? `${body.error}${details ? `: ${details}` : ''} (HTTP ${res.status})`
      : `Request failed with HTTP ${res.status}`
    const err = new Error(detail) as Error & { status?: number; details?: unknown }
    err.status = res.status
    err.details = body.details
    throw err
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// Events
export const eventsApi = {
  getAll: () => request<Event[]>('/events'),
  getById: (id: string) => request<Event>(`/events/${id}`),
  create: (event: Event) =>
    request<Event>('/events', { method: 'POST', body: JSON.stringify(event) }),
  update: (event: Event) =>
    request<Event>(`/events/${event.id}`, { method: 'PUT', body: JSON.stringify(event) }),
  delete: (id: string) =>
    request<void>(`/events/${id}`, { method: 'DELETE' }),
}

// Recipes
export const recipesApi = {
  getAll: () => request<Recipe[]>('/recipes'),
  getById: (id: string) => request<Recipe>(`/recipes/${id}`),
  create: (recipe: Recipe) =>
    request<Recipe>('/recipes', { method: 'POST', body: JSON.stringify(recipe) }),
  update: (recipe: Recipe) =>
    request<Recipe>(`/recipes/${recipe.id}`, { method: 'PUT', body: JSON.stringify(recipe) }),
  delete: (id: string) =>
    request<void>(`/recipes/${id}`, { method: 'DELETE' }),
}

// Feedback
export const feedbackApi = {
  getAll: () => request<MealFeedback[]>('/feedback'),
  getByEvent: (eventId: string) =>
    request<MealFeedback[]>(`/feedback/event/${eventId}`),
  create: (feedback: MealFeedback) =>
    request<MealFeedback>('/feedback', { method: 'POST', body: JSON.stringify(feedback) }),
  update: (feedback: MealFeedback) =>
    request<MealFeedback>(`/feedback/${feedback.id}`, { method: 'PUT', body: JSON.stringify(feedback) }),
  delete: (id: string, eventId: string) =>
    request<void>(`/feedback/${id}?eventId=${encodeURIComponent(eventId)}`, { method: 'DELETE' }),
}

// Troops
export const troopsApi = {
  get: () => request<Troop>('/troops'),
  create: (name: string) =>
    request<{ troop: Troop; member: TroopMember }>('/troops', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (troop: Partial<Troop>) =>
    request<Troop>('/troops', { method: 'PUT', body: JSON.stringify(troop) }),
  join: (inviteCode: string) =>
    request<{ troop: Troop; member: TroopMember }>('/troops/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
}

// Members
export const membersApi = {
  getAll: () => request<TroopMember[]>('/members'),
  getMe: () => request<{ troopId: string; userId: string; role: string }>('/members/me'),
  create: (member: { displayName: string; email: string; role: string }) =>
    request<TroopMember>('/members', { method: 'POST', body: JSON.stringify(member) }),
  updateRole: (id: string, role: string) =>
    request<TroopMember>(`/members/${id}`, { method: 'PUT', body: JSON.stringify({ role }) }),
  approve: (id: string) =>
    request<TroopMember>(`/members/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'active' }) }),
  remove: (id: string) =>
    request<void>(`/members/${id}`, { method: 'DELETE' }),
  deleteData: (id: string) =>
    request<void>(`/members/${id}/data`, { method: 'DELETE' }),
}
