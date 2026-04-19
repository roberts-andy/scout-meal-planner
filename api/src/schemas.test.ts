import { describe, it, expect } from 'vitest'
import {
  createTroopSchema,
  joinTroopSchema,
  createEventSchema,
  createRecipeSchema,
  createFeedbackSchema,
  togglePackedItemSchema,
  togglePurchasedItemSchema,
  emailShoppingListSchema,
  updateMemberSchema,
  validationError,
} from './schemas.js'

// ── createTroopSchema ──

describe('createTroopSchema', () => {
  it('accepts a valid troop name', () => {
    const result = createTroopSchema.safeParse({ name: 'Troop 42' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = createTroopSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const result = createTroopSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects name over 100 chars', () => {
    const result = createTroopSchema.safeParse({ name: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('strips unknown fields', () => {
    const result = createTroopSchema.safeParse({ name: 'Troop 42', id: 'malicious-id', troopId: 'other-troop' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ name: 'Troop 42' })
      expect((result.data as any).id).toBeUndefined()
      expect((result.data as any).troopId).toBeUndefined()
    }
  })
})

// ── joinTroopSchema ──

describe('joinTroopSchema', () => {
  it('accepts a valid invite code', () => {
    expect(joinTroopSchema.safeParse({ inviteCode: 'TROOP-ABCD' }).success).toBe(true)
  })

  it('rejects empty invite code', () => {
    expect(joinTroopSchema.safeParse({ inviteCode: '' }).success).toBe(false)
  })
})

// ── createEventSchema ──

describe('createEventSchema', () => {
  const valid = {
    name: 'Summer Camp',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
    days: [
      {
        date: '2026-07-01',
        meals: [{ id: 'm1', type: 'breakfast', scoutCount: 8 }],
      },
    ],
  }

  it('accepts a minimal valid event', () => {
    expect(createEventSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts optional flags and notes', () => {
    const result = createEventSchema.safeParse({
      ...valid,
      hike: true,
      tentCamping: false,
      notes: 'Bring raincoats',
      description: 'Annual summer camp',
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional packedItems', () => {
    const result = createEventSchema.safeParse({
      ...valid,
      packedItems: ['Skillet', 'Dutch Oven'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional purchasedItems', () => {
    const result = createEventSchema.safeParse({
      ...valid,
      purchasedItems: ['beans-can', 'salt-tsp'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts optional meal course labels', () => {
    const withCourse = {
      ...valid,
      days: [{ date: '2026-07-01', meals: [{ id: 'm1', type: 'dinner', course: 'dessert', scoutCount: 8 }] }],
    }
    expect(createEventSchema.safeParse(withCourse).success).toBe(true)
  })

  it('accepts optional meal dietary notes', () => {
    const withDietaryNotes = {
      ...valid,
      days: [{ date: '2026-07-01', meals: [{ id: 'm1', type: 'dinner', dietaryNotes: 'Nut allergy', scoutCount: 8 }] }],
    }
    expect(createEventSchema.safeParse(withDietaryNotes).success).toBe(true)
  })

  it('rejects missing name', () => {
    expect(createEventSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })

  it('rejects invalid meal type', () => {
    const bad = { ...valid, days: [{ date: '2026-07-01', meals: [{ id: 'm1', type: 'brunch', scoutCount: 8 }] }] }
    expect(createEventSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects negative scoutCount', () => {
    const bad = { ...valid, days: [{ date: '2026-07-01', meals: [{ id: 'm1', type: 'breakfast', scoutCount: -1 }] }] }
    expect(createEventSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts independently selected meal flags', () => {
    const withFlags = {
      ...valid,
      days: [{
        date: '2026-07-01',
        meals: [{ id: 'm1', type: 'breakfast', scoutCount: 8, isTrailside: true, isTimeConstrained: false }]
      }]
    }
    expect(createEventSchema.safeParse(withFlags).success).toBe(true)
  })

  it('rejects non-boolean meal flags', () => {
    const bad = {
      ...valid,
      days: [{
        date: '2026-07-01',
        meals: [{ id: 'm1', type: 'breakfast', scoutCount: 8, isTrailside: 'yes' }]
      }]
    }
    expect(createEventSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects invalid meal course', () => {
    const bad = { ...valid, days: [{ date: '2026-07-01', meals: [{ id: 'm1', type: 'dinner', course: 'appetizer', scoutCount: 8 }] }] }
    expect(createEventSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects non-string meal dietary notes', () => {
    const bad = { ...valid, days: [{ date: '2026-07-01', meals: [{ id: 'm1', type: 'dinner', dietaryNotes: 123, scoutCount: 8 }] }] }
    expect(createEventSchema.safeParse(bad).success).toBe(false)
  })

  it('strips server-controlled fields', () => {
    const result = createEventSchema.safeParse({
      ...valid,
      id: 'client-supplied',
      troopId: 'other-troop',
      createdBy: { userId: 'hacker' },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as any).id).toBeUndefined()
      expect((result.data as any).troopId).toBeUndefined()
      expect((result.data as any).createdBy).toBeUndefined()
    }
  })
})

// ── createRecipeSchema ──

describe('createRecipeSchema', () => {
  const valid = {
    name: 'Pancakes',
    servings: 4,
    ingredients: [{ id: 'i1', name: 'Flour', quantity: 2, unit: 'cup' }],
    variations: [{ id: 'v1', cookingMethod: 'camp-stove', instructions: ['Mix', 'Cook'], equipment: ['Skillet'] }],
  }

  it('accepts a minimal valid recipe', () => {
    expect(createRecipeSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects servings < 1', () => {
    expect(createRecipeSchema.safeParse({ ...valid, servings: 0 }).success).toBe(false)
  })

  it('rejects negative ingredient quantity', () => {
    const bad = { ...valid, ingredients: [{ id: 'i1', name: 'Flour', quantity: -1, unit: 'cup' }] }
    expect(createRecipeSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects invalid cooking method', () => {
    const bad = { ...valid, variations: [{ id: 'v1', cookingMethod: 'microwave', instructions: [], equipment: [] }] }
    expect(createRecipeSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects invalid unit', () => {
    const bad = { ...valid, ingredients: [{ id: 'i1', name: 'Flour', quantity: 2, unit: 'gallon' }] }
    expect(createRecipeSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts optional ingredient estimatedPrice', () => {
    const withPrice = { ...valid, ingredients: [{ id: 'i1', name: 'Flour', quantity: 2, unit: 'cup', estimatedPrice: 4.99 }] }
    expect(createRecipeSchema.safeParse(withPrice).success).toBe(true)
  })

  it('rejects negative ingredient estimatedPrice', () => {
    const bad = { ...valid, ingredients: [{ id: 'i1', name: 'Flour', quantity: 2, unit: 'cup', estimatedPrice: -1 }] }
    expect(createRecipeSchema.safeParse(bad).success).toBe(false)
  })
})

// ── createFeedbackSchema ──

describe('createFeedbackSchema', () => {
  const valid = {
    eventId: 'e1',
    mealId: 'm1',
    recipeId: 'r1',
    rating: { taste: 4, difficulty: 3, portionSize: 5 },
    comments: 'Great',
    whatWorked: 'Prep',
    whatToChange: 'Nothing',
  }

  it('accepts valid feedback', () => {
    expect(createFeedbackSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects rating above 5', () => {
    const bad = { ...valid, rating: { taste: 6, difficulty: 3, portionSize: 5 } }
    expect(createFeedbackSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects rating below 1', () => {
    const bad = { ...valid, rating: { taste: 0, difficulty: 3, portionSize: 5 } }
    expect(createFeedbackSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects missing rating fields', () => {
    const bad = { ...valid, rating: { taste: 4 } }
    expect(createFeedbackSchema.safeParse(bad).success).toBe(false)
  })
})

// ── updateMemberSchema ──

describe('updateMemberSchema', () => {
  it('accepts a valid role', () => {
    expect(updateMemberSchema.safeParse({ role: 'adultLeader' }).success).toBe(true)
  })

  it('accepts a valid status', () => {
    expect(updateMemberSchema.safeParse({ status: 'active' }).success).toBe(true)
  })

  it('accepts an empty body', () => {
    expect(updateMemberSchema.safeParse({}).success).toBe(true)
  })

  it('rejects invalid role', () => {
    expect(updateMemberSchema.safeParse({ role: 'superuser' }).success).toBe(false)
  })

  it('rejects invalid status', () => {
    expect(updateMemberSchema.safeParse({ status: 'banned' }).success).toBe(false)
  })
})

describe('togglePackedItemSchema', () => {
  it('accepts valid payload', () => {
    expect(togglePackedItemSchema.safeParse({ item: 'Skillet', packed: true }).success).toBe(true)
  })

  it('rejects empty item', () => {
    expect(togglePackedItemSchema.safeParse({ item: '', packed: true }).success).toBe(false)
  })

  it('rejects non-boolean packed flag', () => {
    expect(togglePackedItemSchema.safeParse({ item: 'Skillet', packed: 'yes' }).success).toBe(false)
  })
})

describe('togglePurchasedItemSchema', () => {
  it('accepts valid payload', () => {
    expect(togglePurchasedItemSchema.safeParse({ item: 'beans-can', purchased: true }).success).toBe(true)
  })

  it('rejects empty item', () => {
    expect(togglePurchasedItemSchema.safeParse({ item: '', purchased: true }).success).toBe(false)
  })

  it('rejects non-boolean purchased flag', () => {
    expect(togglePurchasedItemSchema.safeParse({ item: 'beans-can', purchased: 'yes' }).success).toBe(false)
  })
})

describe('emailShoppingListSchema', () => {
  it('accepts valid payload', () => {
    const result = emailShoppingListSchema.safeParse({
      recipientEmail: 'parent@example.com',
      items: [{ name: 'Beans', quantity: 2, unit: 'can' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid recipient email', () => {
    const result = emailShoppingListSchema.safeParse({
      recipientEmail: 'not-an-email',
      items: [{ name: 'Beans', quantity: 2, unit: 'can' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty items list', () => {
    const result = emailShoppingListSchema.safeParse({
      recipientEmail: 'parent@example.com',
      items: [],
    })
    expect(result.success).toBe(false)
  })
})

// ── validationError ──

describe('validationError', () => {
  it('formats a ZodError as HTTP 400', () => {
    const parsed = createTroopSchema.safeParse({})
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const response = validationError(parsed.error)
      expect(response.status).toBe(400)
      expect(response.jsonBody.error).toBe('Invalid request body')
      expect(response.jsonBody.details).toBeDefined()
    }
  })
})
