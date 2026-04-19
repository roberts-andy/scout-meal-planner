import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { queryItems, create, update } from '../cosmosdb.js'
import { getTroopContext, unauthorized, forbidden } from '../middleware/auth.js'
import { checkPermission } from '../middleware/roles.js'
import { createMemberSchema, updateMemberSchema, validationError } from '../schemas.js'

const CONTAINER = 'members'

async function membersHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const id = req.params.id
  const method = req.method
  context.log(`${method} /api/members${id ? '/' + id : ''}`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()

  try {
    // GET /api/members — list all members in the troop
    if (method === 'GET' && !id) {
      const members = await queryItems(
        CONTAINER,
        'SELECT * FROM c WHERE c.troopId = @troopId AND c.status != "removed"',
        [{ name: '@troopId', value: auth.troopId }]
      )
      return { jsonBody: members }
    }

    // POST /api/members — create a member in the troop (admin/leader only)
    if (method === 'POST' && !id) {
      if (!checkPermission(auth.role, 'manageMembers')) return forbidden()

      const parsed = createMemberSchema.safeParse(await req.json())
      if (!parsed.success) return validationError(parsed.error)

      const existingMembers = await queryItems<{ id: string }>(
        CONTAINER,
        'SELECT * FROM c WHERE c.troopId = @troopId AND c.email = @email',
        [
          { name: '@troopId', value: auth.troopId },
          { name: '@email', value: parsed.data.email },
        ]
      )
      if (existingMembers.length > 0) {
        return { status: 409, jsonBody: { error: 'Member with this email already exists' } }
      }

      const member = await create(CONTAINER, {
        id: crypto.randomUUID(),
        troopId: auth.troopId,
        // This starts empty for admin-added members and is backfilled by auth middleware
        // when the same email signs in for the first time.
        userId: '',
        status: 'active',
        joinedAt: Date.now(),
        ...parsed.data,
      })

      return { status: 201, jsonBody: member }
    }

    // PUT /api/members/:id — update member role or status (admin/leader only)
    if (method === 'PUT' && id) {
      if (!checkPermission(auth.role, 'manageMembers')) return forbidden()

      const parsed = updateMemberSchema.safeParse(await req.json())
      if (!parsed.success) return validationError(parsed.error)
      const body = parsed.data

      // Find the member in this troop
      const members = await queryItems<any>(
        CONTAINER,
        'SELECT * FROM c WHERE c.id = @id AND c.troopId = @troopId',
        [
          { name: '@id', value: id },
          { name: '@troopId', value: auth.troopId },
        ]
      )

      if (members.length === 0) {
        return { status: 404, jsonBody: { error: 'Member not found' } }
      }

      const member = members[0]

      // Prevent removing the last troopAdmin
      if (member.role === 'troopAdmin' && body.role && body.role !== 'troopAdmin') {
        const admins = await queryItems<any>(
          CONTAINER,
          'SELECT * FROM c WHERE c.troopId = @troopId AND c.role = "troopAdmin"',
          [{ name: '@troopId', value: auth.troopId }]
        )
        if (admins.length <= 1) {
          return { status: 400, jsonBody: { error: 'Cannot remove the last troop admin' } }
        }
      }

      const updated = {
        ...member,
        role: body.role || member.role,
        status: body.status || member.status,
      }

      const result = await update(CONTAINER, id, updated, auth.troopId)
      return { jsonBody: result }
    }

    // DELETE /api/members/:id — remove a member from the troop (admin only)
    if (method === 'DELETE' && id) {
      if (!checkPermission(auth.role, 'manageMembers')) return forbidden()

      // Can't remove yourself if you're the last admin
      const members = await queryItems<any>(
        CONTAINER,
        'SELECT * FROM c WHERE c.id = @id AND c.troopId = @troopId',
        [
          { name: '@id', value: id },
          { name: '@troopId', value: auth.troopId },
        ]
      )

      if (members.length === 0) {
        return { status: 404, jsonBody: { error: 'Member not found' } }
      }

      const member = members[0]
      await update(CONTAINER, id, { ...member, status: 'removed' }, auth.troopId)
      return { status: 204 }
    }

    return { status: 405, jsonBody: { error: 'Method not allowed' } }
  } catch (err) {
    context.error(`${method} /api/members${id ? '/' + id : ''} failed:`, err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

/** PATCH /api/troops/:troopId/members/:memberId — set member status (troopAdmin only) */
async function troopMemberStatusHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const method = req.method
  const troopId = req.params.troopId
  const memberId = req.params.memberId
  context.log(`${method} /api/troops/${troopId}/members/${memberId}`)

  const auth = await getTroopContext(req, context)
  if (!auth) return unauthorized()
  if (auth.role !== 'troopAdmin') return forbidden()
  if (auth.troopId !== troopId) return forbidden()
  if (method !== 'PATCH') return { status: 405, jsonBody: { error: 'Method not allowed' } }

  try {
    const parsed = updateMemberSchema.safeParse(await req.json())
    if (!parsed.success) return validationError(parsed.error)
    if (!parsed.data.status) {
      return {
        status: 400,
        jsonBody: { error: 'Invalid request body', details: { status: ['Required'] } },
      }
    }

    const members = await queryItems<any>(
      CONTAINER,
      'SELECT * FROM c WHERE c.id = @id AND c.troopId = @troopId',
      [
        { name: '@id', value: memberId },
        { name: '@troopId', value: troopId },
      ]
    )

    if (members.length === 0) {
      return { status: 404, jsonBody: { error: 'Member not found' } }
    }

    const member = members[0]
    const updated = await update(CONTAINER, memberId, { ...member, status: parsed.data.status }, troopId)
    return { jsonBody: updated }
  } catch (err) {
    context.error(`PATCH /api/troops/${troopId}/members/${memberId} failed:`, err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

/** GET /api/members/me — get the current user's membership info */
async function memberMeHandler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('GET /api/members/me')

  try {
    const auth = await getTroopContext(req, context)
    if (!auth) {
      // User is authenticated but has no troop membership
      return { status: 404, jsonBody: { error: 'No troop membership found' } }
    }

    return {
      jsonBody: {
        troopId: auth.troopId,
        userId: auth.userId,
        role: auth.role,
      },
    }
  } catch (err) {
    context.error('GET /api/members/me failed:', err)
    return { status: 500, jsonBody: { error: 'Internal server error' } }
  }
}

app.http('members', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: 'members/{id?}',
  handler: membersHandler,
})

app.http('troopMemberStatus', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'troops/{troopId}/members/{memberId}',
  handler: troopMemberStatusHandler,
})

app.http('memberMe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'members/me',
  handler: memberMeHandler,
})
