from __future__ import annotations

import pytest

from app.middleware.auth import TroopContext
from app.routers import events, feedback, members, recipes


def _auth() -> TroopContext:
    return TroopContext(
        userId="user-1",
        email="user@example.com",
        displayName="Test User",
        troopId="troop-1",
        role="troopAdmin",
    )


@pytest.mark.asyncio
async def test_list_events_returns_paginated_shape(monkeypatch: pytest.MonkeyPatch):
    called: dict = {}

    async def fake_query_items_paginated(container_name, query, parameters, limit, continuation_token):
        called["args"] = (container_name, query, parameters, limit, continuation_token)
        return [{"id": "event-1"}], "next-token"

    monkeypatch.setattr(events, "query_items_paginated", fake_query_items_paginated)

    result = await events.list_events(auth=_auth(), limit=25, continuationToken="start-token")
    assert result == {"items": [{"id": "event-1"}], "continuationToken": "next-token"}
    assert called["args"][0] == "events"
    assert called["args"][3] == 25
    assert called["args"][4] == "start-token"


@pytest.mark.asyncio
async def test_list_recipes_returns_paginated_shape(monkeypatch: pytest.MonkeyPatch):
    async def fake_query_items_paginated(container_name, query, parameters, limit, continuation_token):
        return [{"id": "recipe-1"}], None

    monkeypatch.setattr(recipes, "query_items_paginated", fake_query_items_paginated)

    result = await recipes.list_recipes(auth=_auth(), limit=50)
    assert result == {"items": [{"id": "recipe-1"}], "continuationToken": None}


@pytest.mark.asyncio
async def test_list_members_returns_paginated_shape(monkeypatch: pytest.MonkeyPatch):
    async def fake_query_items_paginated(container_name, query, parameters, limit, continuation_token):
        return [{"id": "member-1"}], None

    monkeypatch.setattr(members, "query_items_paginated", fake_query_items_paginated)

    result = await members.list_members(auth=_auth(), limit=10)
    assert result == {"items": [{"id": "member-1"}], "continuationToken": None}


@pytest.mark.asyncio
async def test_list_feedback_returns_paginated_shape(monkeypatch: pytest.MonkeyPatch):
    async def fake_query_items_paginated(container_name, query, parameters, limit, continuation_token):
        return [{"id": "feedback-1"}], "next-token"

    monkeypatch.setattr(feedback, "query_items_paginated", fake_query_items_paginated)

    result = await feedback.list_feedback(auth=_auth(), continuationToken="start-token")
    assert result == {"items": [{"id": "feedback-1"}], "continuationToken": "next-token"}
