import { useMsal } from '@azure/msal-react'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { loginRequest } from '@/lib/authConfig'
import { useCallback, useEffect, useState } from 'react'
import type { AuthUser, TroopRole } from '@/lib/types'

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  troopId: string | null
  role: TroopRole | null
  needsOnboarding: boolean
  authError: { status: number | null; message: string } | null
  retryMembership: () => void
  getAccessToken: () => Promise<string>
  login: () => Promise<void>
  logout: () => void
}

export function useAuth(): AuthState {
  const { instance, accounts, inProgress } = useMsal()
  const [troopId, setTroopId] = useState<string | null>(null)
  const [role, setRole] = useState<TroopRole | null>(null)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [memberLoading, setMemberLoading] = useState(false)
  const [authError, setAuthError] = useState<AuthState['authError']>(null)
  const [retryCount, setRetryCount] = useState(0)

  const retryMembership = useCallback(() => setRetryCount(c => c + 1), [])

  const account = accounts[0] || null
  const isAuthenticated = !!account
  const isLoading = inProgress !== 'none' || memberLoading

  const user: AuthUser | null = account
    ? {
        userId: account.localAccountId,
        email: account.username,
        displayName: account.name || account.username,
      }
    : null

  const getAccessToken = useCallback(async (): Promise<string> => {
    if (!account) throw new Error('Not authenticated')
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account,
      })
      // Use idToken (not accessToken) since we're authenticating with /consumers
      // and OIDC scopes only — the accessToken would be for MS Graph, not our API
      return response.idToken
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        const response = await instance.acquireTokenPopup(loginRequest)
        return response.idToken
      }
      throw err
    }
  }, [instance, account])

  const login = useCallback(async () => {
    await instance.loginRedirect(loginRequest)
  }, [instance])

  const logout = useCallback(() => {
    instance.logoutRedirect()
  }, [instance])

  // Fetch membership info after authentication
  useEffect(() => {
    if (!isAuthenticated) {
      setTroopId(null)
      setRole(null)
      setNeedsOnboarding(false)
      setAuthError(null)
      return
    }

    let cancelled = false
    setMemberLoading(true)
    setAuthError(null)

    ;(async () => {
      try {
        const token = await getAccessToken()
        const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/members/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (cancelled) return

        if (res.ok) {
          const data = await res.json()
          setTroopId(data.troopId)
          setRole(data.role)
          setNeedsOnboarding(false)
          setAuthError(null)
        } else if (res.status === 404) {
          setNeedsOnboarding(true)
          setAuthError(null)
        } else {
          // 401/403/500/etc — surface so the UI can show something actionable
          // instead of falling through to "Failed to load data".
          const body = await res.text().catch(() => '')
          const parsed = (() => {
            try { return JSON.parse(body) as { error?: string } } catch { return null }
          })()
          setAuthError({
            status: res.status,
            message: parsed?.error || body || `Membership check failed (HTTP ${res.status})`,
          })
        }
      } catch (err) {
        if (cancelled) return
        setAuthError({
          status: null,
          message: err instanceof Error ? err.message : 'Network error contacting the API',
        })
      } finally {
        if (!cancelled) setMemberLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, getAccessToken, retryCount])

  return {
    isAuthenticated,
    isLoading,
    user,
    troopId,
    role,
    needsOnboarding,
    authError,
    retryMembership,
    getAccessToken,
    login,
    logout,
  }
}
