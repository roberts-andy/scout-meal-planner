import { InvocationContext } from '@azure/functions'

export type ModerationStatus = 'approved' | 'flagged' | 'pending'

export interface ModerationResult {
  status: ModerationStatus
  flaggedFields: string[]
  checkedAt: number
  provider: 'azure-content-safety'
}

interface ModerationField {
  field: string
  text: string | null | undefined
}

interface CategoryAnalysis {
  severity?: number
}

interface AnalyzeResponse {
  categoriesAnalysis?: CategoryAnalysis[]
}

const API_VERSION = '2024-09-01'
const REQUEST_TIMEOUT_MS = 1500
const DEFAULT_BLOCK_SEVERITY = 4

function getBlockSeverityThreshold(): number {
  const configured = Number(process.env.CONTENT_SAFETY_BLOCK_SEVERITY)
  if (Number.isFinite(configured) && configured >= 0) return configured
  return DEFAULT_BLOCK_SEVERITY
}

function getMaxSeverity(result: AnalyzeResponse): number {
  if (!Array.isArray(result.categoriesAnalysis)) return 0
  return result.categoriesAnalysis.reduce((max, category) => {
    const severity = Number(category?.severity ?? 0)
    return Number.isFinite(severity) ? Math.max(max, severity) : max
  }, 0)
}

async function analyzeText(text: string): Promise<AnalyzeResponse> {
  const endpoint = process.env.CONTENT_SAFETY_ENDPOINT
  const key = process.env.CONTENT_SAFETY_KEY
  if (!endpoint || !key) throw new Error('Content Safety not configured')

  const url = `${endpoint.replace(/\/+$/, '')}/contentsafety/text:analyze?api-version=${API_VERSION}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': key,
    },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Content Safety request failed with status ${response.status}`)
  }
  return response.json() as Promise<AnalyzeResponse>
}

export async function moderateTextFields(
  fields: ModerationField[],
  context: InvocationContext,
): Promise<ModerationResult> {
  const entries = fields
    .map(({ field, text }) => ({ field, text: text?.trim() ?? '' }))
    .filter(({ text }) => text.length > 0)

  if (entries.length === 0) {
    return {
      status: 'approved',
      flaggedFields: [],
      checkedAt: Date.now(),
      provider: 'azure-content-safety',
    }
  }

  const threshold = getBlockSeverityThreshold()

  try {
    const results = await Promise.all(entries.map(async (entry) => ({
      field: entry.field,
      maxSeverity: getMaxSeverity(await analyzeText(entry.text)),
    })))

    const flaggedFields = results
      .filter((result) => result.maxSeverity >= threshold)
      .map((result) => result.field)

    return {
      status: flaggedFields.length > 0 ? 'flagged' : 'approved',
      flaggedFields,
      checkedAt: Date.now(),
      provider: 'azure-content-safety',
    }
  } catch (error) {
    context.warn(
      'Content moderation check failed; content will be stored with pending status and hidden from non-admin users until manually reviewed.',
      error,
    )
    return {
      status: 'pending',
      flaggedFields: [],
      checkedAt: Date.now(),
      provider: 'azure-content-safety',
    }
  }
}

export function canViewModeratedContent(
  role: string,
  moderation: { status?: ModerationStatus } | undefined,
): boolean {
  if (role === 'troopAdmin') return true
  return (moderation?.status ?? 'approved') === 'approved'
}
