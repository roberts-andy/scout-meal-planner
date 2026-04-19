import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getById, update } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { togglePurchasedItemSchema, validationError } from '../schemas.js'

const CONTAINER = 'events'

async function eventPurchasedHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  context.log(`PATCH /api/events/${id}/purchased`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()
  if (!checkPermission(auth.role, 'viewContent')) return forbidden()

  try {
    const parsed = togglePurchasedItemSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)

    const existing = await getById(CONTAINER, id, auth.troopId)
    if (!existing) return { status: 404, jsonBody: { error: 'Event not found' } }

    const purchasedItems = new Set<string>(existing.purchasedItems ?? [])
    if (parsed.data.purchased) {
      purchasedItems.add(parsed.data.item)
    } else {
      purchasedItems.delete(parsed.data.item)
    }

    const updatedEvent = await update(
      CONTAINER,
      id,
      {
        ...existing,
        id,
        troopId: auth.troopId,
        purchasedItems: Array.from(purchasedItems),
        updatedAt: Date.now(),
        updatedBy: { userId: auth.userId, displayName: auth.displayName },
      },
      auth.troopId
    )

    return { jsonBody: updatedEvent }
  } catch (err) {
    context.error(`PATCH /api/events/${id}/purchased failed:`, err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

app.http('eventPurchased', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'events/{id}/purchased',
  handler: eventPurchasedHandler,
})
