"""Seed the Cosmos DB emulator with test data for E2E tests.

Idempotent — safe to run multiple times. Uses upsert so existing data is updated.
Run via: python tests/e2e/seed_db.py  (from the repo root)
Or called programmatically from Playwright globalSetup.
"""

from __future__ import annotations

import asyncio
import os
import sys
import time

# Ensure api/ is on the path when run as a script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "api"))

# Well-known IDs matching the E2E test auth bypass
E2E_TROOP_ID = "e2e-troop-00000000-0000-0000-0001"
E2E_USER_ID = "e2e-test-user"
E2E_MEMBER_ID = "e2e-member-00000000-0000-0000-0001"

_now_ms = int(time.time() * 1000)

SEED_TROOP = {
    "id": E2E_TROOP_ID,
    "name": "E2E Test Troop",
    "inviteCode": "E2E-TEST",
    "createdBy": E2E_USER_ID,
    "createdAt": _now_ms,
    "updatedAt": _now_ms,
}

SEED_MEMBER = {
    "id": E2E_MEMBER_ID,
    "troopId": E2E_TROOP_ID,
    "userId": E2E_USER_ID,
    "email": "e2e@test.local",
    "displayName": "E2E Test User",
    "role": "troopAdmin",
    "status": "active",
    "joinedAt": _now_ms,
}

SEED_EVENTS = [
    {
        "id": "e2e-event-00000000-0000-0000-0001",
        "troopId": E2E_TROOP_ID,
        "name": "E2E Weekend Campout",
        "description": "A test camping event for E2E validation",
        "startDate": "2026-06-15",
        "endDate": "2026-06-17",
        "location": "Test Campground",
        "headcount": 12,
        "characteristics": ["camping", "outdoor-cooking"],
        "days": [
            {
                "date": "2026-06-15",
                "meals": {
                    "dinner": {
                        "recipeId": "e2e-recipe-00000000-0000-0000-0001",
                        "name": "E2E Camp Chili",
                    },
                },
            },
            {
                "date": "2026-06-16",
                "meals": {
                    "breakfast": {
                        "recipeId": "e2e-recipe-00000000-0000-0000-0002",
                        "name": "E2E Pancakes",
                    },
                },
            },
        ],
        "createdBy": E2E_USER_ID,
        "createdAt": _now_ms,
        "updatedAt": _now_ms,
    },
]

SEED_RECIPES = [
    {
        "id": "e2e-recipe-00000000-0000-0000-0001",
        "troopId": E2E_TROOP_ID,
        "name": "E2E Camp Chili",
        "description": "A hearty chili for testing",
        "servings": 8,
        "cookingMethod": "campfire",
        "ingredients": [
            {"name": "ground beef", "quantity": 2, "unit": "lbs"},
            {"name": "kidney beans", "quantity": 2, "unit": "cans"},
            {"name": "diced tomatoes", "quantity": 2, "unit": "cans"},
            {"name": "chili powder", "quantity": 3, "unit": "tbsp"},
        ],
        "instructions": ["Brown the beef.", "Add beans and tomatoes.", "Season and simmer 30 min."],
        "createdBy": E2E_USER_ID,
        "createdAt": _now_ms,
        "updatedAt": _now_ms,
    },
    {
        "id": "e2e-recipe-00000000-0000-0000-0002",
        "troopId": E2E_TROOP_ID,
        "name": "E2E Pancakes",
        "description": "Classic pancakes for testing",
        "servings": 6,
        "cookingMethod": "camp-stove",
        "ingredients": [
            {"name": "pancake mix", "quantity": 2, "unit": "cups"},
            {"name": "water", "quantity": 1.5, "unit": "cups"},
            {"name": "cooking oil", "quantity": 2, "unit": "tbsp"},
        ],
        "instructions": ["Mix batter.", "Cook on griddle until golden."],
        "createdBy": E2E_USER_ID,
        "createdAt": _now_ms,
        "updatedAt": _now_ms,
    },
]


async def seed() -> None:
    """Seed the database with E2E test data using upsert for idempotency."""
    from app.cosmosdb import init_database, _containers

    await init_database()

    if not _containers:
        raise RuntimeError(
            "Cosmos DB init succeeded but no containers available. "
            "Check that COSMOS_CONNECTION_STRING or COSMOS_ENDPOINT is set "
            "and the database is reachable."
        )

    troops = _containers["troops"]
    members = _containers["members"]
    events = _containers["events"]
    recipes = _containers["recipes"]

    print("Seeding E2E troop...")
    await troops.upsert_item(SEED_TROOP)

    print("Seeding E2E member...")
    await members.upsert_item(SEED_MEMBER)

    for event in SEED_EVENTS:
        print(f"Seeding E2E event: {event['name']}...")
        await events.upsert_item(event)

    for recipe in SEED_RECIPES:
        print(f"Seeding E2E recipe: {recipe['name']}...")
        await recipes.upsert_item(recipe)

    print("E2E seed complete ✓")


if __name__ == "__main__":
    asyncio.run(seed())
