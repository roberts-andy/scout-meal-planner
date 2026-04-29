"""Seed sample events into the Cosmos DB events container.

Usage:
    cd api
    python seed_events.py [--troop-id TROOP_ID]

Requires COSMOS_CONNECTION_STRING or COSMOS_ENDPOINT env var.
Defaults to the seed troop 00000000-0000-0000-0000-000000000001.
"""

from __future__ import annotations

import argparse
import asyncio
import time
import uuid

SEED_TROOP_ID = "00000000-0000-0000-0000-000000000001"

SEED_ACTOR = {
    "userId": "seed",
    "displayName": "Seed Admin",
    "email": "admin@example.com",
}


def _id() -> str:
    return str(uuid.uuid4())


def _now() -> int:
    return int(time.time() * 1000)


def _meal(meal_type: str, name: str, *, time_str: str | None = None, scout_count: int = 0, course: str = "main", is_trailside: bool = False) -> dict:
    return {
        "id": _id(),
        "type": meal_type,
        "course": course,
        "dietaryNotes": None,
        "name": name,
        "recipeId": None,
        "scoutCount": scout_count,
        "isTrailside": is_trailside,
        "isTimeConstrained": False,
        "selectedVariationId": None,
        "notes": None,
        "time": time_str,
    }


def _day(date: str, meals: list[dict]) -> dict:
    return {"date": date, "meals": meals}


def _event(
    name: str,
    start_date: str,
    end_date: str,
    days: list[dict],
    *,
    departure_time: str | None = None,
    return_time: str | None = None,
    description: str | None = None,
    notes: str | None = None,
    tags: list[str] | None = None,
    scout_count: int = 12,
    adult_count: int = 4,
    power_available: bool | None = None,
    running_water: bool | None = None,
    trailer_access: bool | None = None,
    expected_weather: str | None = None,
) -> dict:
    now = _now()
    return {
        "id": _id(),
        "troopId": SEED_TROOP_ID,
        "name": name,
        "startDate": start_date,
        "endDate": end_date,
        "departureTime": departure_time,
        "returnTime": return_time,
        "headcount": {
            "scoutCount": scout_count,
            "adultCount": adult_count,
            "guestCount": 0,
        },
        "days": days,
        "packedItems": None,
        "purchasedItems": None,
        "notes": notes,
        "tags": tags,
        "powerAvailable": power_available,
        "runningWater": running_water,
        "trailerAccess": trailer_access,
        "expectedWeather": expected_weather,
        "description": description,
        "link": None,
        "moderation": {"status": "approved", "flaggedFields": []},
        "createdAt": now,
        "createdBy": SEED_ACTOR,
        "updatedAt": now,
        "updatedBy": SEED_ACTOR,
    }


EVENTS: list[dict] = [
    # ── Catamount Camporee: May 1-3, 2026 (overnight camping weekend) ──
    _event(
        "Catamount Camporee",
        "2026-05-01",
        "2026-05-03",
        [
            _day("2026-05-01", [
                _meal("dinner", "Friday Arrival Dinner", time_str="18:00", scout_count=12),
            ]),
            _day("2026-05-02", [
                _meal("breakfast", "Saturday Breakfast", time_str="07:30", scout_count=12),
                _meal("lunch", "Saturday Lunch", time_str="12:00", scout_count=12, is_trailside=True),
                _meal("dinner", "Saturday Dinner", time_str="18:00", scout_count=12),
            ]),
            _day("2026-05-03", [
                _meal("breakfast", "Sunday Breakfast", time_str="07:30", scout_count=12),
                _meal("lunch", "Sunday Lunch (pack out)", time_str="11:00", scout_count=12, is_trailside=True),
            ]),
        ],
        departure_time="17:00",
        return_time="14:00",
        description="Annual Catamount Camporee — campcraft competitions, orienteering, and campfire program.",
        notes="Sign up by Apr 17, 2026. Patrol cooking — each patrol cooks their own meals.",
        tags=["camporee", "overnight", "competition"],
        scout_count=12,
        adult_count=4,
        running_water=False,
        power_available=False,
        trailer_access=True,
        expected_weather="Mid-50s, chance of rain Saturday",
    ),

    # ── Ziplining Day Trip: May 17, 2026 ──
    _event(
        "Ziplining — Day Trip",
        "2026-05-17",
        "2026-05-17",
        [
            _day("2026-05-17", [
                _meal("lunch", "Packed Lunch", time_str="12:00", scout_count=10, is_trailside=True),
                _meal("snack", "Trail Snacks", time_str="14:30", scout_count=10, is_trailside=True, course="snack"),
            ]),
        ],
        departure_time="10:30",
        return_time="16:00",
        description="Ziplining adventure day trip. Scouts should bring a packed lunch and water.",
        notes="Sign up by Apr 07, 2026. Waiver forms required. Wear closed-toe shoes.",
        tags=["day-trip", "adventure", "ziplining"],
        scout_count=10,
        adult_count=3,
        running_water=True,
        power_available=True,
        trailer_access=False,
        expected_weather="Upper 60s, sunny",
    ),

    # ── Lake Dennison: Jun 12-14, 2026 (camp, bike, swim) ──
    _event(
        "Lake Dennison — Camp, Bike, Swim",
        "2026-06-12",
        "2026-06-14",
        [
            _day("2026-06-12", [
                _meal("dinner", "Friday Arrival Dinner", time_str="18:30", scout_count=15),
            ]),
            _day("2026-06-13", [
                _meal("breakfast", "Saturday Breakfast", time_str="07:30", scout_count=15),
                _meal("lunch", "Saturday Trail Lunch", time_str="12:00", scout_count=15, is_trailside=True),
                _meal("dinner", "Saturday Cookout", time_str="18:00", scout_count=15),
            ]),
            _day("2026-06-14", [
                _meal("breakfast", "Sunday Breakfast", time_str="08:00", scout_count=15),
            ]),
        ],
        departure_time="17:30",
        return_time="13:00",
        description="Weekend at Lake Dennison State Recreation Area. Biking, swimming, and camping.",
        notes="Bring bikes, helmets, and swim gear. Campsite has water spigots.",
        tags=["camping", "biking", "swimming", "weekend"],
        scout_count=15,
        adult_count=5,
        running_water=True,
        power_available=False,
        trailer_access=True,
        expected_weather="Low 70s, partly cloudy",
    ),

    # ── Pemi-G Backpacking Trip: Jun 13-14, 2026 ──
    _event(
        "Pemi-G Backpacking Trip",
        "2026-06-13",
        "2026-06-14",
        [
            _day("2026-06-13", [
                _meal("lunch", "Trail Lunch Day 1", time_str="12:00", scout_count=8, is_trailside=True),
                _meal("dinner", "Backcountry Dinner", time_str="18:00", scout_count=8, is_trailside=True),
            ]),
            _day("2026-06-14", [
                _meal("breakfast", "Backcountry Breakfast", time_str="06:30", scout_count=8, is_trailside=True),
                _meal("lunch", "Trail Lunch Day 2", time_str="12:00", scout_count=8, is_trailside=True),
            ]),
        ],
        departure_time="06:00",
        return_time="16:00",
        description="Backpacking the Pemigewasset loop in the White Mountains. Lightweight gear required.",
        notes="All meals trailside — pack lightweight, calorie-dense food. Bear canisters required.",
        tags=["backpacking", "hiking", "white-mountains", "advanced"],
        scout_count=8,
        adult_count=3,
        running_water=False,
        power_available=False,
        trailer_access=False,
        expected_weather="Mid-60s at base, 40s at elevation, possible afternoon storms",
    ),

    # ── Nantucket Camp and Bike: Oct 10-12, 2026 ──
    _event(
        "Nantucket Camp and Bike",
        "2026-10-10",
        "2026-10-12",
        [
            _day("2026-10-10", [
                _meal("lunch", "Saturday Lunch on the Island", time_str="12:30", scout_count=12, is_trailside=True),
                _meal("dinner", "Saturday Campfire Dinner", time_str="18:00", scout_count=12),
            ]),
            _day("2026-10-11", [
                _meal("breakfast", "Sunday Breakfast", time_str="07:30", scout_count=12),
                _meal("lunch", "Sunday Lunch", time_str="12:00", scout_count=12),
                _meal("dinner", "Sunday Dinner", time_str="18:00", scout_count=12),
            ]),
            _day("2026-10-12", [
                _meal("breakfast", "Monday Breakfast", time_str="07:00", scout_count=12),
                _meal("lunch", "Ferry Ride Lunch", time_str="12:00", scout_count=12, is_trailside=True),
            ]),
        ],
        departure_time="05:30",
        return_time="17:00",
        description="Columbus Day weekend trip to Nantucket. Biking the island trails and beach camping.",
        notes="Sign up by 09/29/26. Ferry tickets will be purchased in advance. Bring bikes and helmets.",
        tags=["camping", "biking", "island", "weekend"],
        scout_count=12,
        adult_count=4,
        running_water=True,
        power_available=False,
        trailer_access=False,
        expected_weather="Low 60s, breezy, possible fog",
    ),

    # ── Klondike Derby: Jan 30 - Feb 1, 2026 ──
    _event(
        "Klondike Derby",
        "2026-01-30",
        "2026-02-01",
        [
            _day("2026-01-30", [
                _meal("dinner", "Friday Arrival Dinner", time_str="18:00", scout_count=14),
            ]),
            _day("2026-01-31", [
                _meal("breakfast", "Saturday Breakfast", time_str="07:00", scout_count=14),
                _meal("lunch", "Saturday Trail Lunch", time_str="12:00", scout_count=14, is_trailside=True),
                _meal("dinner", "Saturday Dinner", time_str="18:00", scout_count=14),
            ]),
            _day("2026-02-01", [
                _meal("breakfast", "Sunday Breakfast", time_str="07:30", scout_count=14),
            ]),
        ],
        departure_time="16:30",
        return_time="12:00",
        description="Annual Klondike Derby — winter camping with sled races and survival skill stations.",
        notes="Cold weather camping. Scouts must have cold-weather sleeping bags rated to 0°F. Hot meals are critical.",
        tags=["winter-camping", "klondike", "competition", "cold-weather"],
        scout_count=14,
        adult_count=5,
        running_water=False,
        power_available=False,
        trailer_access=True,
        expected_weather="Highs in the 20s, lows near 5°F, possible snow",
    ),
]


async def seed_events(troop_id: str) -> None:
    from app.cosmosdb import init_database, create_item

    await init_database()

    for event in EVENTS:
        event["troopId"] = troop_id
        try:
            await create_item("events", event)
            print(f"  + {event['name']} ({event['startDate']})")
        except Exception as exc:
            if getattr(exc, "status_code", None) == 409:
                print(f"  = {event['name']} (already exists)")
            else:
                print(f"  ! {event['name']}: {exc}")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Seed sample events into Cosmos DB")
    parser.add_argument("--troop-id", default=SEED_TROOP_ID, help="Target troop ID")
    args = parser.parse_args()

    print(f"Seeding {len(EVENTS)} events for troop {args.troop_id}...")
    await seed_events(args.troop_id)
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
