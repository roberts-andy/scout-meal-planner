import { describe, it, expect } from 'vitest'
import { checkPermission, hasMinimumRole } from './roles.js'

describe('checkPermission', () => {
  it('troopAdmin has all permissions', () => {
    expect(checkPermission('troopAdmin', 'manageTroop')).toBe(true)
    expect(checkPermission('troopAdmin', 'manageMembers')).toBe(true)
    expect(checkPermission('troopAdmin', 'manageEvents')).toBe(true)
    expect(checkPermission('troopAdmin', 'manageRecipes')).toBe(true)
    expect(checkPermission('troopAdmin', 'submitFeedback')).toBe(true)
    expect(checkPermission('troopAdmin', 'viewContent')).toBe(true)
  })

  it('scout cannot manage events', () => {
    expect(checkPermission('scout', 'manageEvents')).toBe(false)
  })

  it('scout cannot manage recipes', () => {
    expect(checkPermission('scout', 'manageRecipes')).toBe(false)
  })

  it('scout can submit feedback and view content', () => {
    expect(checkPermission('scout', 'submitFeedback')).toBe(true)
    expect(checkPermission('scout', 'viewContent')).toBe(true)
  })

  it('patrolLeader can manage recipes but not events', () => {
    expect(checkPermission('patrolLeader', 'manageRecipes')).toBe(true)
    expect(checkPermission('patrolLeader', 'manageEvents')).toBe(false)
  })

  it('seniorPatrolLeader can manage events', () => {
    expect(checkPermission('seniorPatrolLeader', 'manageEvents')).toBe(true)
  })

  it('adultLeader cannot manage troop or members', () => {
    expect(checkPermission('adultLeader', 'manageTroop')).toBe(false)
    expect(checkPermission('adultLeader', 'manageMembers')).toBe(false)
  })

  it('unknown role has no permissions', () => {
    expect(checkPermission('wizard', 'viewContent')).toBe(false)
  })
})

describe('hasMinimumRole', () => {
  it('troopAdmin meets any minimum', () => {
    expect(hasMinimumRole('troopAdmin', 'scout')).toBe(true)
    expect(hasMinimumRole('troopAdmin', 'troopAdmin')).toBe(true)
  })

  it('scout does not meet adultLeader minimum', () => {
    expect(hasMinimumRole('scout', 'adultLeader')).toBe(false)
  })

  it('patrolLeader meets scout minimum', () => {
    expect(hasMinimumRole('patrolLeader', 'scout')).toBe(true)
  })

  it('unknown role fails', () => {
    expect(hasMinimumRole('wizard', 'scout')).toBe(false)
  })
})
