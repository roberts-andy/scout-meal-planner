import pytest
from pydantic import ValidationError

from app.schemas import CreateEvent, CreateRecipe, UpdateEvent, UpdateRecipe


def test_update_models_are_not_create_aliases():
    assert UpdateEvent is not CreateEvent
    assert UpdateRecipe is not CreateRecipe


def test_update_event_accepts_partial_payload():
    body = UpdateEvent(name="Campout")
    assert body.model_dump(exclude_unset=True) == {"name": "Campout"}


def test_update_recipe_accepts_partial_payload():
    body = UpdateRecipe(description="Updated")
    assert body.model_dump(exclude_unset=True) == {"description": "Updated"}


def test_update_event_validates_constraints_when_field_is_set():
    with pytest.raises(ValidationError):
        UpdateEvent(name="")


def test_create_event_accepts_new_logistics_fields():
    body = CreateEvent(
        name="Campout",
        startDate="2026-07-01",
        endDate="2026-07-02",
        days=[{"date": "2026-07-01", "meals": []}],
        powerAvailable=True,
        runningWater=False,
        trailerAccess=True,
        expectedWeather="Rain likely",
    )
    assert body.model_dump()["powerAvailable"] is True
    assert body.model_dump()["runningWater"] is False
    assert body.model_dump()["trailerAccess"] is True
    assert body.model_dump()["expectedWeather"] == "Rain likely"


def test_update_event_rejects_invalid_logistics_field_types():
    with pytest.raises(ValidationError):
        UpdateEvent(powerAvailable=[])
    with pytest.raises(ValidationError):
        UpdateEvent(expectedWeather={})


def test_update_recipe_validates_constraints_when_field_is_set():
    with pytest.raises(ValidationError):
        UpdateRecipe(servings=0)


def test_create_event_defaults_headcount_to_zeroes():
    body = CreateEvent(name="Campout", startDate="2026-07-01", endDate="2026-07-02", days=[])
    assert body.headcount.model_dump() == {"scoutCount": 0, "adultCount": 0, "guestCount": 0}
    assert body.departureTime is None
    assert body.returnTime is None


def test_event_headcount_rejects_negative_values():
    with pytest.raises(ValidationError):
        CreateEvent(
            name="Campout",
            startDate="2026-07-01",
            endDate="2026-07-02",
            days=[],
            headcount={"scoutCount": -1, "adultCount": 0, "guestCount": 0},
        )
