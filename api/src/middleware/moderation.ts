/**
 * Content moderation utility — FR-023
 *
 * Pluggable design:
 *  1. Built-in regex filter catches obvious profanity (always runs)
 *  2. Azure Content Safety API integration when CONTENT_SAFETY_ENDPOINT is set
 *
 * Content is stamped with a moderationStatus: 'approved' | 'flagged' | 'pending'
 * Flagged content is stored but excluded from default queries (FR-025 will add admin review).
 */

export type ModerationStatus = 'approved' | 'flagged' | 'pending'

export interface ModerationResult {
  status: ModerationStatus
  flaggedFields: string[]
  /** Human-readable reasons per field */
  reasons: Record<string, string>
}

// Patterns that are clearly inappropriate for a scout troop app
const PROFANITY_PATTERNS = [
  /\b(fuck|shit|damn|ass|bitch|bastard|crap|dick|piss)\w*\b/i,
  /\b(nigger|faggot|retard)\w*\b/i,
  /\b(kill\s+yourself|kys)\b/i,
]

/**
 * Check a single string against built-in profanity patterns.
 * Returns the matched pattern reason or null if clean.
 */
function checkBuiltInFilter(text: string): string | null {
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) {
      return 'Contains prohibited language'
    }
  }
  return null
}

/**
 * Call Azure Content Safety API if configured.
 * Returns a reason string if flagged, null if approved.
 * Fails open (returns null) on network errors to satisfy NFR-006 (non-blocking).
 */
async function checkAzureContentSafety(text: string): Promise<string | null> {
  const endpoint = process.env.CONTENT_SAFETY_ENDPOINT
  const key = process.env.CONTENT_SAFETY_KEY
  if (!endpoint || !key) return null // not configured — skip

  try {
    const response = await fetch(`${endpoint}/contentsafety/text:analyze?api-version=2024-09-01`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'] }),
    })

    if (!response.ok) {
      // Fail open — don't block content on service errors
      console.warn(`Content Safety API returned ${response.status}`)
      return null
    }

    const result = (await response.json()) as {
      categoriesAnalysis: Array<{ category: string; severity: number }>
    }

    const flagged = result.categoriesAnalysis?.filter((c) => c.severity >= 2)
    if (flagged && flagged.length > 0) {
      return `Flagged by content safety: ${flagged.map((c) => c.category).join(', ')}`
    }
    return null
  } catch (err) {
    // Fail open on network errors (NFR-006: non-blocking)
    console.warn('Content Safety API call failed:', err)
    return null
  }
}

/**
 * Moderate a map of named text fields.
 * Returns a ModerationResult with overall status and per-field details.
 *
 * Usage:
 *   const result = await moderateContent({ name: 'My Recipe', instructions: 'Step 1...' })
 *   if (result.status === 'flagged') return moderationError(result)
 */
export async function moderateContent(
  fields: Record<string, string | undefined>
): Promise<ModerationResult> {
  const flaggedFields: string[] = []
  const reasons: Record<string, string> = {}

  for (const [field, text] of Object.entries(fields)) {
    if (!text || text.trim().length === 0) continue

    // Built-in filter (synchronous, always runs)
    const builtInReason = checkBuiltInFilter(text)
    if (builtInReason) {
      flaggedFields.push(field)
      reasons[field] = builtInReason
      continue // no need to call Azure API if already flagged
    }

    // Azure Content Safety (async, only when configured)
    const azureReason = await checkAzureContentSafety(text)
    if (azureReason) {
      flaggedFields.push(field)
      reasons[field] = azureReason
    }
  }

  return {
    status: flaggedFields.length > 0 ? 'flagged' : 'approved',
    flaggedFields,
    reasons,
  }
}

/** Build an HTTP 422 response for flagged content */
export function moderationError(result: ModerationResult) {
  return {
    status: 422 as const,
    jsonBody: {
      error: 'Content flagged by moderation',
      moderationStatus: result.status,
      flaggedFields: result.flaggedFields,
      reasons: result.reasons,
    },
  }
}

/**
 * Extract moderatable text fields from a recipe body.
 */
export function recipeTextFields(body: Record<string, any>): Record<string, string | undefined> {
  const fields: Record<string, string | undefined> = {
    name: body.name,
    description: body.description,
  }

  // Check variation instructions and notes
  if (Array.isArray(body.variations)) {
    for (let i = 0; i < body.variations.length; i++) {
      const v = body.variations[i]
      if (v.notes) fields[`variations[${i}].notes`] = v.notes
      if (Array.isArray(v.instructions)) {
        for (let j = 0; j < v.instructions.length; j++) {
          if (v.instructions[j]) fields[`variations[${i}].instructions[${j}]`] = v.instructions[j]
        }
      }
    }
  }

  return fields
}

/**
 * Extract moderatable text fields from a feedback body.
 */
export function feedbackTextFields(body: Record<string, any>): Record<string, string | undefined> {
  return {
    comments: body.comments,
    whatWorked: body.whatWorked,
    whatToChange: body.whatToChange,
  }
}

/**
 * Extract moderatable text fields from an event body.
 */
export function eventTextFields(body: Record<string, any>): Record<string, string | undefined> {
  return {
    name: body.name,
    description: body.description,
    notes: body.notes,
  }
}
