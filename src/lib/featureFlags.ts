export type FeatureFlagKey =
  | 'enable-content-moderation'
  | 'enable-email-shopping-list'
  | 'enable-shared-links'
  | 'enable-feedback'
  | 'enable-print-recipes'

export type FeatureFlags = Record<FeatureFlagKey, boolean>

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  'enable-content-moderation': false,
  'enable-email-shopping-list': false,
  'enable-shared-links': false,
  'enable-feedback': false,
  'enable-print-recipes': true,
}

let flags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS }
const loggedEvaluations = new Set<string>()

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return null
}

function toFeatureFlags(value: unknown): Partial<FeatureFlags> {
  if (!value || typeof value !== 'object') return {}
  const source = value as Record<string, unknown>
  return (Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagKey[]).reduce((next, key) => {
    const parsed = coerceBoolean(source[key])
    if (parsed != null) {
      next[key] = parsed
    }
    return next
  }, {} as Partial<FeatureFlags>)
}

export async function loadFeatureFlags() {
  try {
    const response = await fetch('/runtime.config.json', { cache: 'no-store' })
    if (!response.ok) {
      console.warn(`Failed to load runtime feature flags (HTTP ${response.status})`)
      return
    }

    const runtimeConfig = await response.json().catch(() => ({}))
    const runtimeFlags = toFeatureFlags((runtimeConfig as { featureFlags?: unknown }).featureFlags)
    flags = { ...DEFAULT_FEATURE_FLAGS, ...runtimeFlags }
    console.info('Loaded runtime feature flags', flags)
  } catch (error) {
    console.warn('Failed to load runtime feature flags', error)
  }
}

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  const enabled = flags[flag]
  const key = `${flag}:${enabled}`
  if (!loggedEvaluations.has(key)) {
    console.info('Feature flag evaluated', { flag, enabled })
    loggedEvaluations.add(key)
  }
  return enabled
}

export function __setFeatureFlagsForTests(value: Partial<FeatureFlags>) {
  flags = { ...DEFAULT_FEATURE_FLAGS, ...value }
}
