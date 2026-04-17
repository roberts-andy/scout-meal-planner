/** Role hierarchy and permission definitions for troop-based RBAC */

export type TroopRole = 'troopAdmin' | 'adultLeader' | 'seniorPatrolLeader' | 'patrolLeader' | 'scout'

export type Permission =
  | 'manageEvents'
  | 'manageRecipes'
  | 'submitFeedback'
  | 'viewContent'
  | 'manageMembers'
  | 'manageTroop'

/** Roles ordered from most to least privileged */
const roleHierarchy: TroopRole[] = [
  'troopAdmin',
  'adultLeader',
  'seniorPatrolLeader',
  'patrolLeader',
  'scout',
]

/** Permissions each role has (inclusive — higher roles inherit all lower-role permissions) */
const rolePermissions: Record<TroopRole, Permission[]> = {
  troopAdmin: ['manageTroop', 'manageMembers', 'manageEvents', 'manageRecipes', 'submitFeedback', 'viewContent'],
  adultLeader: ['manageEvents', 'manageRecipes', 'submitFeedback', 'viewContent'],
  seniorPatrolLeader: ['manageEvents', 'manageRecipes', 'submitFeedback', 'viewContent'],
  patrolLeader: ['manageRecipes', 'submitFeedback', 'viewContent'],
  scout: ['submitFeedback', 'viewContent'],
}

/** Check whether a role has a specific permission */
export function checkPermission(role: string, permission: Permission): boolean {
  const perms = rolePermissions[role as TroopRole]
  if (!perms) return false
  return perms.includes(permission)
}

/** Check whether a role meets or exceeds the minimum required role level */
export function hasMinimumRole(role: string, minimumRole: TroopRole): boolean {
  const roleIndex = roleHierarchy.indexOf(role as TroopRole)
  const minIndex = roleHierarchy.indexOf(minimumRole)
  if (roleIndex === -1 || minIndex === -1) return false
  return roleIndex <= minIndex
}
