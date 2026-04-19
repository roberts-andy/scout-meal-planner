import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getById, update } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { togglePackedItemSchema, validationError } from '../schemas.js'

const CONTAINER = 'events'

async function eventPackedHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  context.log(`PATCH /api/events/${id}/packed`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()
  if (!checkPermission(auth.role, 'viewContent')) return forbidden()

  try {
    const parsed = togglePackedItemSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)

    const existing = await getById(CONTAINER, id, auth.troopId)
    if (!existing) return { status: 404, jsonBody: { error: 'Event not found' } }

    const packedItems = new Set<string>(Array.isArray(existing.packedItems) ? existing.packedItems : [])
    if (parsed.data.packed) {
      packedItems.add(parsed.data.item)
    } else {
      packedItems.delete(parsed.data.item)
    }

    const updatedEvent = await update(
      CONTAINER,
      id,
      {
        ...existing,
        id,
        troopId: auth.troopId,
        packedItems: Array.from(packedItems),
        updatedAt: Date.now(),
        updatedBy: { userId: auth.userId, displayName: auth.displayName },
      },
      auth.troopId
    )

    return { jsonBody: updatedEvent }
  } catch (err) {
    context.error(`PATCH /api/events/${id}/packed failed:`, err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

app.http('eventPacked', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'events/{id}/packed',
  handler: eventPackedHandler,
})
