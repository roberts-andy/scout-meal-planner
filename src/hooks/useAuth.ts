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
      return response.accessToken
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        const response = await instance.acquireTokenPopup(loginRequest)
        return response.accessToken
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
      return
    }

    let cancelled = false
    setMemberLoading(true)

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
        } else if (res.status === 404) {
          setNeedsOnboarding(true)
        }
      } catch {
        // Network error — will retry on next render
      } finally {
        if (!cancelled) setMemberLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, getAccessToken])

  return {
    isAuthenticated,
    isLoading,
    user,
    troopId,
    role,
    needsOnboarding,
    getAccessToken,
    login,
    logout,
  }
}
