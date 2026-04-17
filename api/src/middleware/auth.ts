import { HttpRequest, InvocationContext } from '@azure/functions'
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose'
import { queryItems } from '../cosmosdb.js'

const CLIENT_ID = process.env.ENTRA_CLIENT_ID

if (!CLIENT_ID) {
  console.warn('ENTRA_CLIENT_ID not set — auth will reject all requests')
}

// Microsoft identity platform /consumers endpoint
const jwksUri = 'https://login.microsoftonline.com/consumers/discovery/v2.0/keys'
const issuer = 'https://login.microsoftonline.com/9188040d-6c67-4c5b-b112-36a304b66dad/v2.0'

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUri))
  }
  return jwks
}

export interface TokenClaims {
  userId: string
  email: string
  displayName: string
}

export interface TroopContext {
  userId: string
  email: string
  displayName: string
  troopId: string
  role: string
}

/** Extract and validate the Bearer token from the request */
export async function validateToken(req: HttpRequest): Promise<TokenClaims | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer,
      audience: CLIENT_ID,
    })

    return {
      userId: payload.sub || payload.oid as string,
      email: (payload.emails as string[])?.[0] || payload.preferred_username as string || '',
      displayName: payload.name as string || '',
    }
  } catch {
    return null
  }
}

/** Validate token and look up the user's troop membership */
export async function getTroopContext(req: HttpRequest, context: InvocationContext): Promise<TroopContext | null> {
  const claims = await validateToken(req)
  if (!claims) return null

  // Look up the user's active membership across all troops
  const members = await queryItems<any>(
    'members',
    'SELECT * FROM c WHERE c.userId = @userId AND c.status = "active"',
    [{ name: '@userId', value: claims.userId }]
  )

  if (members.length === 0) return null

  const member = members[0]
  return {
    userId: claims.userId,
    email: claims.email,
    displayName: claims.displayName,
    troopId: member.troopId,
    role: member.role,
  }
}

/** Return 401 response */
export function unauthorized(message = 'Authentication required') {
  return { status: 401 as const, jsonBody: { error: message } }
}

/** Return 403 response */
export function forbidden(message = 'Insufficient permissions') {
  return { status: 403 as const, jsonBody: { error: message } }
}
