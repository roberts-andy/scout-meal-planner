import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  moderateContent,
  moderationError,
  recipeTextFields,
  feedbackTextFields,
  eventTextFields,
} from './moderation.js'

beforeEach(() => {
  vi.stubGlobal('console', { ...console, warn: vi.fn() })
  // Clear Azure env vars so only built-in filter runs by default
  delete process.env.CONTENT_SAFETY_ENDPOINT
  delete process.env.CONTENT_SAFETY_KEY
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('moderateContent — built-in filter', () => {
  it('approves clean text', async () => {
    const result = await moderateContent({ name: 'Trail Mix', description: 'A healthy snack' })
    expect(result.status).toBe('approved')
    expect(result.flaggedFields).toEqual([])
  })

  it('flags profanity in any field', async () => {
    const result = await moderateContent({
      name: 'Good Recipe',
      description: 'This tastes like shit',
    })
    expect(result.status).toBe('flagged')
    expect(result.flaggedFields).toContain('description')
    expect(result.reasons['description']).toBe('Contains prohibited language')
  })

  it('flags multiple fields independently', async () => {
    const result = await moderateContent({
      name: 'damn good',
      description: 'fuck this',
    })
    expect(result.status).toBe('flagged')
    expect(result.flaggedFields).toContain('name')
    expect(result.flaggedFields).toContain('description')
  })

  it('skips empty and undefined fields', async () => {
    const result = await moderateContent({
      name: 'Good Name',
      description: undefined,
      notes: '',
    })
    expect(result.status).toBe('approved')
    expect(result.flaggedFields).toEqual([])
  })

  it('catches case-insensitive profanity', async () => {
    const result = await moderateContent({ name: 'SHIT recipe' })
    expect(result.status).toBe('flagged')
  })

  it('catches slur patterns', async () => {
    const result = await moderateContent({ comment: 'kys loser' })
    expect(result.status).toBe('flagged')
    expect(result.reasons['comment']).toBe('Contains prohibited language')
  })
})

describe('moderateContent — Azure Content Safety integration', () => {
  it('calls Azure API when configured and flags high-severity content', async () => {
    process.env.CONTENT_SAFETY_ENDPOINT = 'https://test.cognitiveservices.azure.com'
    process.env.CONTENT_SAFETY_KEY = 'test-key'

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          categoriesAnalysis: [
            { category: 'Violence', severity: 4 },
            { category: 'Hate', severity: 0 },
          ],
        }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await moderateContent({ text: 'some concerning text' })
    expect(result.status).toBe('flagged')
    expect(result.reasons['text']).toContain('Violence')
    expect(mockFetch).toHaveBeenCalledOnce()
  })

  it('approves content when Azure API returns low severity', async () => {
    process.env.CONTENT_SAFETY_ENDPOINT = 'https://test.cognitiveservices.azure.com'
    process.env.CONTENT_SAFETY_KEY = 'test-key'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            categoriesAnalysis: [
              { category: 'Violence', severity: 0 },
              { category: 'Hate', severity: 1 },
            ],
          }),
      })
    )

    const result = await moderateContent({ text: 'a normal recipe note' })
    expect(result.status).toBe('approved')
  })

  it('fails open when Azure API returns an error', async () => {
    process.env.CONTENT_SAFETY_ENDPOINT = 'https://test.cognitiveservices.azure.com'
    process.env.CONTENT_SAFETY_KEY = 'test-key'

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 })
    )

    const result = await moderateContent({ text: 'anything' })
    expect(result.status).toBe('approved') // fail open
  })

  it('fails open when Azure API call throws', async () => {
    process.env.CONTENT_SAFETY_ENDPOINT = 'https://test.cognitiveservices.azure.com'
    process.env.CONTENT_SAFETY_KEY = 'test-key'

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))

    const result = await moderateContent({ text: 'anything' })
    expect(result.status).toBe('approved') // fail open
  })

  it('skips Azure API when not configured', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    await moderateContent({ text: 'anything' })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('moderationError', () => {
  it('builds a 422 response with flagged details', () => {
    const resp = moderationError({
      status: 'flagged',
      flaggedFields: ['name'],
      reasons: { name: 'Contains prohibited language' },
    })
    expect(resp.status).toBe(422)
    expect(resp.jsonBody.error).toBe('Content flagged by moderation')
    expect(resp.jsonBody.flaggedFields).toEqual(['name'])
  })
})

describe('field extractors', () => {
  it('recipeTextFields extracts name, description, variation instructions and notes', () => {
    const fields = recipeTextFields({
      name: 'Tacos',
      description: 'Campfire tacos',
      servings: 8,
      variations: [
        {
          instructions: ['Step 1', 'Step 2'],
          notes: 'Use foil',
        },
      ],
    })
    expect(fields).toEqual({
      name: 'Tacos',
      description: 'Campfire tacos',
      'variations[0].notes': 'Use foil',
      'variations[0].instructions[0]': 'Step 1',
      'variations[0].instructions[1]': 'Step 2',
    })
  })

  it('feedbackTextFields extracts comments, whatWorked, whatToChange', () => {
    const fields = feedbackTextFields({
      comments: 'Great',
      whatWorked: 'Taste',
      whatToChange: 'Nothing',
      rating: { taste: 5 },
    })
    expect(fields).toEqual({
      comments: 'Great',
      whatWorked: 'Taste',
      whatToChange: 'Nothing',
    })
  })

  it('eventTextFields extracts name, description, notes', () => {
    const fields = eventTextFields({
      name: 'Camp',
      description: 'Summer camp',
      notes: 'Bring sunscreen',
      startDate: '2026-07-01',
    })
    expect(fields).toEqual({
      name: 'Camp',
      description: 'Summer camp',
      notes: 'Bring sunscreen',
    })
  })
})
