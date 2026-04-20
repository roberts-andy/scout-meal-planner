import type {
  Event,
  Recipe,
  MealFeedback,
  Troop,
  TroopMember,
  SharedEventPlan,
  FlaggedContentAction,
  FlaggedContentItem,
} from './types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const DEFAULT_PAGE_SIZE = 50

export interface PaginatedResponse<T> {
  items: T[]
  continuationToken: string | null
}

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

function buildPaginationPath(path: string, params?: { limit?: number; continuationToken?: string }) {
  const search = new URLSearchParams()
  if (params?.limit) {
    search.set('limit', String(params.limit))
  }
  if (params?.continuationToken) {
    search.set('continuationToken', params.continuationToken)
  }
  const query = search.toString()
  return query.length > 0 ? `${path}?${query}` : path
}

function withDefaultPagination(params?: { limit?: number; continuationToken?: string }) {
  return {
    limit: params?.limit ?? DEFAULT_PAGE_SIZE,
    ...(params?.continuationToken ? { continuationToken: params.continuationToken } : {}),
  }
}

async function getAllPages<T>(
  fetchPage: (continuationToken?: string) => Promise<PaginatedResponse<T>>,
): Promise<T[]> {
  let continuationToken: string | undefined
  const items: T[] = []

  do {
    const page = await fetchPage(continuationToken)
    items.push(...page.items)
    continuationToken = page.continuationToken ?? undefined
  } while (continuationToken)

  return items
}

// Events
export const eventsApi = {
  getPage: (params?: { limit?: number; continuationToken?: string }) =>
    request<PaginatedResponse<Event>>(buildPaginationPath('/events', withDefaultPagination(params))),
  getAll: () => getAllPages<Event>((continuationToken) => eventsApi.getPage({ limit: DEFAULT_PAGE_SIZE, continuationToken })),
  getById: (id: string) => request<Event>(`/events/${id}`),
  create: (event: Event) =>
    request<Event>('/events', { method: 'POST', body: JSON.stringify(event) }),
  update: (event: Event) =>
    request<Event>(`/events/${event.id}`, { method: 'PUT', body: JSON.stringify(event) }),
  togglePackedItem: (eventId: string, item: string, packed: boolean) =>
    request<Event>(`/events/${eventId}/packed`, {
      method: 'PATCH',
      body: JSON.stringify({ item, packed }),
    }),
  togglePurchasedItem: (eventId: string, item: string, purchased: boolean) =>
    request<Event>(`/events/${eventId}/purchased`, {
      method: 'PATCH',
      body: JSON.stringify({ item, purchased }),
    }),
  delete: (id: string) =>
    request<void>(`/events/${id}`, { method: 'DELETE' }),
  getShare: (id: string) =>
    request<{ shareToken: string | null; shareUrl: string | null }>(`/events/${id}/share`),
  regenerateShare: (id: string) =>
    request<{ shareToken: string; shareUrl: string }>(`/events/${id}/share`, { method: 'POST' }),
  revokeShare: (id: string) =>
    request<void>(`/events/${id}/share`, { method: 'DELETE' }),
  emailShoppingList: (
    id: string,
    payload: {
      recipientEmail: string
      items: Array<{ name: string; quantity: number; unit: string }>
    }
  ) =>
    request<{ message: string }>(`/events/${id}/shopping-list/email`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}

// Recipes
export const recipesApi = {
  getPage: (params?: { limit?: number; continuationToken?: string }) =>
    request<PaginatedResponse<Recipe>>(buildPaginationPath('/recipes', withDefaultPagination(params))),
  getAll: () => getAllPages<Recipe>((continuationToken) => recipesApi.getPage({ limit: DEFAULT_PAGE_SIZE, continuationToken })),
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
  getPage: (params?: { limit?: number; continuationToken?: string }) =>
    request<PaginatedResponse<MealFeedback>>(buildPaginationPath('/feedback', withDefaultPagination(params))),
  getAll: () => getAllPages<MealFeedback>((continuationToken) => feedbackApi.getPage({ limit: DEFAULT_PAGE_SIZE, continuationToken })),
  getByEvent: (eventId: string) =>
    request<MealFeedback[]>(`/feedback/event/${eventId}`),
  getByRecipe: (recipeId: string) =>
    request<MealFeedback[]>(`/feedback/recipe/${recipeId}`),
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
  getPage: (params?: { limit?: number; continuationToken?: string }) =>
    request<PaginatedResponse<TroopMember>>(buildPaginationPath('/members', withDefaultPagination(params))),
  getAll: () => getAllPages<TroopMember>((continuationToken) => membersApi.getPage({ limit: DEFAULT_PAGE_SIZE, continuationToken })),
  getMe: () => request<{ troopId: string; userId: string; role: string }>('/members/me'),
  create: (member: { displayName: string; email: string; role: string }) =>
    request<TroopMember>('/members', { method: 'POST', body: JSON.stringify(member) }),
  updateRole: (id: string, role: string) =>
    request<TroopMember>(`/members/${id}`, { method: 'PUT', body: JSON.stringify({ role }) }),
  approve: (id: string) =>
    request<TroopMember>(`/members/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'active' }) }),
  updateStatus: (troopId: string, id: string, status: 'deactivated' | 'removed') =>
    request<TroopMember>(`/troops/${troopId}/members/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (id: string) =>
    request<void>(`/members/${id}`, { method: 'DELETE' }),
  deleteData: (id: string) =>
    request<void>(`/members/${id}/data`, { method: 'DELETE' }),
}

export const shareApi = {
  getByToken: (token: string) => request<SharedEventPlan>(`/share/${encodeURIComponent(token)}`),
}

export const adminApi = {
  getFlaggedContent: () => request<FlaggedContentItem[]>('/admin/flagged-content'),
  reviewFlaggedContent: (
    id: string,
    payload: {
      action: FlaggedContentAction
      edits?: {
        name?: string
        description?: string
        comments?: string
        whatWorked?: string
        whatToChange?: string
      }
    },
  ) => request<{ id: string; contentId: string; contentType: string; action: FlaggedContentAction }>(
    `/admin/flagged-content/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(payload) },
  ),
}
