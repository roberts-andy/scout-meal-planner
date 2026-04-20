from __future__ import annotations

from typing import Literal

TroopRole = Literal[
    "troopAdmin",
    "adultLeader",
    "seniorPatrolLeader",
    "patrolLeader",
    "scout",
]

Permission = Literal[
    "manageEvents",
    "manageRecipes",
    "submitFeedback",
    "viewContent",
    "manageMembers",
    "manageTroop",
]

_ROLE_HIERARCHY: list[TroopRole] = [
    "troopAdmin",
    "adultLeader",
    "seniorPatrolLeader",
    "patrolLeader",
    "scout",
]

_ROLE_PERMISSIONS: dict[TroopRole, list[Permission]] = {
    "troopAdmin": ["manageTroop", "manageMembers", "manageEvents", "manageRecipes", "submitFeedback", "viewContent"],
    "adultLeader": ["manageEvents", "manageRecipes", "submitFeedback", "viewContent"],
    "seniorPatrolLeader": ["manageEvents", "manageRecipes", "submitFeedback", "viewContent"],
    "patrolLeader": ["manageRecipes", "submitFeedback", "viewContent"],
    "scout": ["submitFeedback", "viewContent"],
}


def check_permission(role: str, permission: Permission) -> bool:
    perms = _ROLE_PERMISSIONS.get(role)  # type: ignore[arg-type]
    if not perms:
        return False
    return permission in perms


def has_minimum_role(role: str, minimum_role: TroopRole) -> bool:
    if role not in _ROLE_HIERARCHY or minimum_role not in _ROLE_HIERARCHY:
        return False
    return _ROLE_HIERARCHY.index(role) <= _ROLE_HIERARCHY.index(minimum_role)
