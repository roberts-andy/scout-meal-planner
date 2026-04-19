import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { getAll, getById, create, update, queryItems } from '../cosmosdb.js'
import { validateToken, getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { createTroopSchema, updateTroopSchema, joinTroopSchema, validationError } from '../schemas.js'
import { randomBytes } from 'crypto'

const CONTAINER = 'troops'

function generateInviteCode(): string {
  return 'TROOP-' + randomBytes(3).toString('hex').toUpperCase().slice(0, 4)
}

function toFirstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || ''
}

async function troopsHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const method = req.method
  context.log(`${method} /api/troops`)

  // POST /api/troops — create a new troop (user just needs a valid token, no troop yet)
  if (method === 'POST') {
    const claims = await validateToken(req)
    if (!claims) return unauthorized()

    const parsed = createTroopSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)
    const now = Date.now()
    const troopId = crypto.randomUUID()

    const troop = {
      id: troopId,
      name: parsed.data.name,
      inviteCode: generateInviteCode(),
      createdBy: claims.userId,
      createdAt: now,
      updatedAt: now,
    }

    const created = await create(CONTAINER, troop)

    // Auto-create the founder as troopAdmin
    const member = {
      id: crypto.randomUUID(),
      troopId,
      userId: claims.userId,
      email: claims.email,
      displayName: claims.displayName,
      role: 'troopAdmin',
      status: 'active',
      joinedAt: now,
    }
    await create('members', member)

    return { status: 201, jsonBody: { troop: created, member } }
  }

  // GET /api/troops — get the user's current troop
  if (method === 'GET') {
    const auth = await getTroopContext(req, context)
    if (!auth) return unauthorized()

    const troop = await getById(CONTAINER, auth.troopId)
    if (!troop) return { status: 404, jsonBody: { error: 'Troop not found' } }
    return { jsonBody: troop }
  }

  // PUT /api/troops — update troop details (admin only)
  if (method === 'PUT') {
    const auth = await getTroopContext(req, context)
    if (!auth) return unauthorized()
    if (!checkPermission(auth.role, 'manageTroop')) return forbidden()

    const parsed = updateTroopSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)
    const existing = await getById<any>(CONTAINER, auth.troopId)
    if (!existing) return { status: 404, jsonBody: { error: 'Troop not found' } }

    const updated = { ...existing, ...parsed.data, id: auth.troopId, updatedAt: Date.now() }
    const result = await update(CONTAINER, auth.troopId, updated)
    return { jsonBody: result }
  }

  return { status: 405, jsonBody: { error: 'Method not allowed' } }
}

/** POST /api/troops/join — join a troop via invite code */
async function joinTroopHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('POST /api/troops/join')

  const claims = await validateToken(req)
  if (!claims) return unauthorized()

  const parsed = joinTroopSchema.safeParse(await req.json())
  if (!parsed.success) return validationError(parsed.error)
  const { inviteCode } = parsed.data

  // Find troop by invite code
  const troops = await queryItems<any>(
    CONTAINER,
    'SELECT * FROM c WHERE c.inviteCode = @code',
    [{ name: '@code', value: inviteCode }]
  )

  if (troops.length === 0) {
    return { status: 404, jsonBody: { error: 'Invalid invite code' } }
  }

  const troop = troops[0]

  // Check if already a member
  const existing = await queryItems<any>(
    'members',
    'SELECT * FROM c WHERE c.troopId = @troopId AND c.userId = @userId',
    [
      { name: '@troopId', value: troop.id },
      { name: '@userId', value: claims.userId },
    ]
  )

  if (existing.length > 0) {
    return { status: 409, jsonBody: { error: 'Already a member of this troop' } }
  }

  const member = {
    id: crypto.randomUUID(),
    troopId: troop.id,
    displayName: toFirstName(claims.displayName),
    role: 'scout',  // Default role; admin can upgrade
    status: 'pending',
  }

  const created = await create('members', member)
  return { status: 201, jsonBody: { troop, member: created } }
}

app.http('troops', {
  methods: ['GET', 'POST', 'PUT'],
  authLevel: 'anonymous',
  route: 'troops',
  handler: troopsHandler,
})

app.http('joinTroop', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'troops/join',
  handler: joinTroopHandler,
})
