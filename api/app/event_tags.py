from __future__ import annotations

LEGACY_CHARACTERISTICS = {
    "hike": "Hike",
    "highAltitude": "High Altitude",
    "tentCamping": "Tent Camping",
    "cabinCamping": "Cabin Camping",
}


def get_event_tags(event: dict) -> list[str]:
    normalized_tags: list[str] = []
    seen: set[str] = set()

    for raw_tag in event.get("tags") or []:
        tag = str(raw_tag).strip()
        if not tag:
            continue
        key = tag.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized_tags.append(tag)

    for field_name, label in LEGACY_CHARACTERISTICS.items():
        if event.get(field_name):
            key = label.lower()
            if key not in seen:
                seen.add(key)
                normalized_tags.append(label)

    return normalized_tags


def with_migrated_tags(event: dict) -> dict:
    return {
        **event,
        "tags": get_event_tags(event),
    }
