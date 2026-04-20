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


def test_update_recipe_validates_constraints_when_field_is_set():
    with pytest.raises(ValidationError):
        UpdateRecipe(servings=0)
