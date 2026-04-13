const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// Events
export const eventsApi = {
  getAll: () => request<import('./types').Event[]>('/events'),
  getById: (id: string) => request<import('./types').Event>(`/events/${id}`),
  create: (event: import('./types').Event) =>
    request<import('./types').Event>('/events', { method: 'POST', body: JSON.stringify(event) }),
  update: (event: import('./types').Event) =>
    request<import('./types').Event>(`/events/${event.id}`, { method: 'PUT', body: JSON.stringify(event) }),
  delete: (id: string) =>
    request<void>(`/events/${id}`, { method: 'DELETE' }),
}

// Recipes
export const recipesApi = {
  getAll: () => request<import('./types').Recipe[]>('/recipes'),
  getById: (id: string) => request<import('./types').Recipe>(`/recipes/${id}`),
  create: (recipe: import('./types').Recipe) =>
    request<import('./types').Recipe>('/recipes', { method: 'POST', body: JSON.stringify(recipe) }),
  update: (recipe: import('./types').Recipe) =>
    request<import('./types').Recipe>(`/recipes/${recipe.id}`, { method: 'PUT', body: JSON.stringify(recipe) }),
  delete: (id: string) =>
    request<void>(`/recipes/${id}`, { method: 'DELETE' }),
}

// Feedback
export const feedbackApi = {
  getAll: () => request<import('./types').MealFeedback[]>('/feedback'),
  getByEvent: (eventId: string) =>
    request<import('./types').MealFeedback[]>(`/feedback/event/${eventId}`),
  create: (feedback: import('./types').MealFeedback) =>
    request<import('./types').MealFeedback>('/feedback', { method: 'POST', body: JSON.stringify(feedback) }),
  update: (feedback: import('./types').MealFeedback) =>
    request<import('./types').MealFeedback>(`/feedback/${feedback.id}`, { method: 'PUT', body: JSON.stringify(feedback) }),
  delete: (id: string, eventId: string) =>
    request<void>(`/feedback/${id}?eventId=${encodeURIComponent(eventId)}`, { method: 'DELETE' }),
}
