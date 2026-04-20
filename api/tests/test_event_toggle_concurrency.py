from __future__ import annotations

import asyncio
from copy import deepcopy
from types import SimpleNamespace

import pytest

from app.routers import event_packed, event_purchased
from app.schemas import TogglePackedItem, TogglePurchasedItem


class _PreconditionFailed(Exception):
    status_code = 412


@pytest.mark.asyncio
async def test_toggle_packed_retries_on_etag_conflict_and_preserves_both_updates(monkeypatch: pytest.MonkeyPatch):
    state = {"id": "event-1", "troopId": "troop-1", "packedItems": [], "_etag": "etag-1"}
    initial_read_barrier = asyncio.Event()
    initial_reads = 0
    if_match_values: list[str | None] = []

    async def fake_get_by_id(_container: str, _item_id: str, _pk: str):
        nonlocal initial_reads
        document = deepcopy(state)
        if initial_reads < 2:
            initial_reads += 1
            if initial_reads == 2:
                initial_read_barrier.set()
            await initial_read_barrier.wait()
        return document

    async def fake_update_item(_container: str, _item_id: str, item: dict, _pk: str, if_match: str | None = None):
        if_match_values.append(if_match)
        if if_match != state["_etag"]:
            raise _PreconditionFailed()
        next_state = deepcopy(item)
        next_state["_etag"] = f"etag-{int(state['_etag'].split('-')[1]) + 1}"
        state.update(next_state)
        return deepcopy(state)

    monkeypatch.setattr(event_packed, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(event_packed, "update_item", fake_update_item)

    auth = SimpleNamespace(role="scout", troopId="troop-1", userId="user-1", displayName="Scout One")
    await asyncio.gather(
        event_packed.toggle_packed("event-1", TogglePackedItem(item="Skillet", packed=True), auth),
        event_packed.toggle_packed("event-1", TogglePackedItem(item="Spatula", packed=True), auth),
    )

    assert set(state["packedItems"]) == {"Skillet", "Spatula"}
    assert len(if_match_values) >= 3
    assert all(value is not None for value in if_match_values)


@pytest.mark.asyncio
async def test_toggle_purchased_retries_on_etag_conflict_and_preserves_both_updates(monkeypatch: pytest.MonkeyPatch):
    state = {"id": "event-2", "troopId": "troop-1", "purchasedItems": [], "_etag": "etag-1"}
    initial_read_barrier = asyncio.Event()
    initial_reads = 0
    if_match_values: list[str | None] = []

    async def fake_get_by_id(_container: str, _item_id: str, _pk: str):
        nonlocal initial_reads
        document = deepcopy(state)
        if initial_reads < 2:
            initial_reads += 1
            if initial_reads == 2:
                initial_read_barrier.set()
            await initial_read_barrier.wait()
        return document

    async def fake_update_item(_container: str, _item_id: str, item: dict, _pk: str, if_match: str | None = None):
        if_match_values.append(if_match)
        if if_match != state["_etag"]:
            raise _PreconditionFailed()
        next_state = deepcopy(item)
        next_state["_etag"] = f"etag-{int(state['_etag'].split('-')[1]) + 1}"
        state.update(next_state)
        return deepcopy(state)

    monkeypatch.setattr(event_purchased, "get_by_id", fake_get_by_id)
    monkeypatch.setattr(event_purchased, "update_item", fake_update_item)

    auth = SimpleNamespace(role="scout", troopId="troop-1", userId="user-2", displayName="Scout Two")
    await asyncio.gather(
        event_purchased.toggle_purchased("event-2", TogglePurchasedItem(item="beans-can", purchased=True), auth),
        event_purchased.toggle_purchased("event-2", TogglePurchasedItem(item="salt-tsp", purchased=True), auth),
    )

    assert set(state["purchasedItems"]) == {"beans-can", "salt-tsp"}
    assert len(if_match_values) >= 3
    assert all(value is not None for value in if_match_values)
