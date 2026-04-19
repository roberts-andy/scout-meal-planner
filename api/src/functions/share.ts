import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getById, queryItems, update, getAllByTroop } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'

const EVENTS_CONTAINER = 'events'
const RECIPES_CONTAINER = 'recipes'
const SHARE_TOKEN_SEGMENTS = 2
// 2 UUIDs (~256 bits before formatting) keeps tokens practically unguessable for public URLs.

function generateShareToken() {
  return Array.from({ length: SHARE_TOKEN_SEGMENTS }, () => crypto.randomUUID().replace(/-/g, '')).join('')
}

function getShareUrl(req: HttpRequest, token: string) {
  const origin = new URL(req.url).origin
  return `${origin}/share/${token}`
}

async function eventShareHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const eventId = req.params.id
  const method = req.method
  context.log(`${method} /api/events/${eventId}/share`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()

  if (!checkPermission(auth.role, 'manageEvents')) return forbidden()

  try {
    const existing = await getById<any>(EVENTS_CONTAINER, eventId, auth.troopId)
    if (!existing) return { status: 404, jsonBody: { error: 'Event not found' } }

    if (method === 'GET') {
      const token = existing.shareToken as string | undefined
      return {
        jsonBody: {
          shareToken: token ?? null,
          shareUrl: token ? getShareUrl(req, token) : null,
        },
      }
    }

    if (method === 'POST') {
      const shareToken = generateShareToken()
      await update(EVENTS_CONTAINER, eventId, {
        ...existing,
        shareToken,
        shareTokenUpdatedAt: Date.now(),
        updatedAt: Date.now(),
        updatedBy: { userId: auth.userId, displayName: auth.displayName },
      }, auth.troopId)
      return {
        jsonBody: {
          shareToken,
          shareUrl: getShareUrl(req, shareToken),
        },
      }
    }

    if (method === 'DELETE') {
      const nextEvent = { ...existing }
      delete nextEvent.shareToken
      delete nextEvent.shareTokenUpdatedAt
      await update(EVENTS_CONTAINER, eventId, {
        ...nextEvent,
        updatedAt: Date.now(),
        updatedBy: { userId: auth.userId, displayName: auth.displayName },
      }, auth.troopId)
      return { status: 204 }
    }

    return { status: 405, jsonBody: { error: 'Method not allowed' } }
  } catch (err) {
    context.error(`${method} /api/events/${eventId}/share failed:`, err)
    const message = err instanceof Error ? err.message : String(err)
    return { status: 500, jsonBody: { error: message } }
  }
}

async function sharedEventHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const token = req.params.token
  context.log(`GET /api/share/${token}`)

  try {
    const [event] = await queryItems<any>(
      EVENTS_CONTAINER,
      'SELECT * FROM c WHERE c.shareToken = @token',
      [{ name: '@token', value: token }]
    )
    if (!event) return { status: 404, jsonBody: { error: 'Shared event not found' } }

    const allRecipes = await getAllByTroop<any>(RECIPES_CONTAINER, event.troopId)
    const recipeIds = new Set<string>()
    for (const day of event.days ?? []) {
      for (const meal of day.meals ?? []) {
        if (meal.recipeId) recipeIds.add(meal.recipeId)
      }
    }

    const recipes = allRecipes
      .filter((recipe) => recipeIds.has(recipe.id))
      .map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        servings: recipe.servings,
        ingredients: (recipe.ingredients ?? []).map((ingredient: any) => ({
          id: ingredient.id,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          category: ingredient.category,
        })),
        variations: (recipe.variations ?? []).map((variation: any) => ({
          id: variation.id,
          equipment: variation.equipment ?? [],
        })),
      }))

    return {
      jsonBody: {
        event: {
          id: event.id,
          name: event.name,
          startDate: event.startDate,
          endDate: event.endDate,
          hike: event.hike,
          highAltitude: event.highAltitude,
          tentCamping: event.tentCamping,
          cabinCamping: event.cabinCamping,
          days: (event.days ?? []).map((day: any) => ({
            date: day.date,
            meals: (day.meals ?? []).map((meal: any) => ({
              id: meal.id,
              type: meal.type,
              course: meal.course,
              recipeId: meal.recipeId,
              scoutCount: meal.scoutCount,
              isTrailside: meal.isTrailside,
              isTimeConstrained: meal.isTimeConstrained,
            })),
          })),
        },
        recipes,
      },
    }
  } catch (err) {
    context.error(`GET /api/share/${token} failed:`, err)
    const message = err instanceof Error ? err.message : String(err)
    return { status: 500, jsonBody: { error: message } }
  }
}

app.http('eventShare', {
  methods: ['GET', 'POST', 'DELETE'],
  authLevel: 'anonymous',
  route: 'events/{id}/share',
  handler: eventShareHandler,
})

app.http('sharedEvent', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'share/{token}',
  handler: sharedEventHandler,
})
