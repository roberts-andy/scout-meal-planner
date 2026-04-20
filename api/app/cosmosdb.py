from __future__ import annotations

import logging
import os
import time

from azure.core.pipeline.transport import AioHttpTransport
from azure.core import MatchConditions
from azure.cosmos.aio import CosmosClient, DatabaseProxy, ContainerProxy
from azure.identity.aio import DefaultAzureCredential


class _SafeAioHttpTransport(AioHttpTransport):
    """Strips non-HTTP kwargs that azure-cosmos leaks through the pipeline."""

    _COSMOS_KWARGS = frozenset({
        "partition_key", "response_hook", "max_integrated_cache_staleness_in_ms",
    })

    async def send(self, request, **kwargs):
        for key in self._COSMOS_KWARGS:
            kwargs.pop(key, None)
        return await super().send(request, **kwargs)

logger = logging.getLogger(__name__)

_endpoint = os.environ.get("COSMOS_ENDPOINT")
_connection_string = os.environ.get("COSMOS_CONNECTION_STRING")
_database_id = os.environ.get("COSMOS_DATABASE", "scout-meal-planner")

_client: CosmosClient | None = None
_health_check_client: CosmosClient | None = None
_database: DatabaseProxy | None = None
_containers: dict[str, ContainerProxy] = {}
_initialized = False

_CONTAINER_DEFINITIONS = [
    {"id": "troops", "partition_key": "/id"},
    {"id": "members", "partition_key": "/troopId"},
    {"id": "events", "partition_key": "/troopId"},
    {"id": "recipes", "partition_key": "/troopId"},
    {"id": "feedback", "partition_key": "/troopId"},
]

_SEED_TROOPS = [
    {
        "id": "00000000-0000-0000-0000-000000000001",
        "name": "Troop 1 Bolton",
        "inviteCode": "TROOP-B01T",
        "createdBy": "seed",
        "createdAt": int(time.time() * 1000),
        "updatedAt": int(time.time() * 1000),
    },
]

_SEED_MEMBERS = [
    {
        "id": "00000000-0000-0000-0000-00000000000A",
        "troopId": "00000000-0000-0000-0000-000000000001",
        "userId": "",
        "email": "admin@example.com",
        "displayName": "Seed Admin",
        "role": "troopAdmin",
        "status": "active",
        "joinedAt": int(time.time() * 1000),
    },
]


async def _seed_database() -> None:
    try:
        troops_container = _containers["troops"]
        for troop in _SEED_TROOPS:
            try:
                await troops_container.read_item(troop["id"], partition_key=troop["id"])
            except Exception as exc:
                if getattr(exc, "status_code", None) == 404:
                    await troops_container.create_item(troop)
                    logger.info("Seeded troop: %s", troop["name"])

        members_container = _containers["members"]
        for member in _SEED_MEMBERS:
            try:
                await members_container.read_item(member["id"], partition_key=member["troopId"])
            except Exception as exc:
                if getattr(exc, "status_code", None) == 404:
                    await members_container.create_item(member)
                    logger.info("Seeded member: %s as %s", member["email"], member["role"])
    except Exception:
        logger.warning("Seed database failed (non-fatal)", exc_info=True)


async def init_database() -> None:
    global _client, _database, _initialized

    if _initialized:
        return

    if not _endpoint and not _connection_string:
        logger.warning("Neither COSMOS_ENDPOINT nor COSMOS_CONNECTION_STRING is set. Database calls will fail.")
        return

    if _endpoint:
        _client = CosmosClient(_endpoint, credential=DefaultAzureCredential(), transport=_SafeAioHttpTransport())
    else:
        _client = CosmosClient.from_connection_string(_connection_string, transport=_SafeAioHttpTransport())

    _database = await _client.create_database_if_not_exists(_database_id)

    for defn in _CONTAINER_DEFINITIONS:
        container = await _database.create_container_if_not_exists(
            id=defn["id"],
            partition_key={"paths": [defn["partition_key"]], "kind": "Hash"},
        )
        _containers[defn["id"]] = container

    await _seed_database()
    _initialized = True


async def check_database_connection() -> None:
    """Perform a read-only Cosmos DB connectivity check.

    Prefer existing initialized handles first (_database, then _client) and
    only fall back to a cached lightweight client when initialization has not
    completed. The dedicated fallback client avoids triggering full init_database()
    side effects during health probes. Raises when configuration is missing or
    the database cannot be read.
    """
    global _health_check_client

    if _database is not None:
        await _database.read()
        return

    if _client is not None:
        database = _client.get_database_client(_database_id)
        await database.read()
        return

    if not _endpoint and not _connection_string:
        raise RuntimeError("Cosmos DB configuration missing: set COSMOS_ENDPOINT or COSMOS_CONNECTION_STRING")

    if _health_check_client is None:
        if _endpoint:
            _health_check_client = CosmosClient(
                _endpoint,
                credential=DefaultAzureCredential(),
                transport=_SafeAioHttpTransport(),
            )
        else:
            _health_check_client = CosmosClient.from_connection_string(
                _connection_string,
                transport=_SafeAioHttpTransport(),
            )

    database = _health_check_client.get_database_client(_database_id)
    await database.read()


async def close_database_clients() -> None:
    global _client, _health_check_client, _database, _initialized

    clients_to_close: list[CosmosClient] = []

    if _client is not None:
        clients_to_close.append(_client)
        _client = None

    if _health_check_client is not None and _health_check_client not in clients_to_close:
        clients_to_close.append(_health_check_client)
    _health_check_client = None

    _database = None
    _containers.clear()
    _initialized = False

    for client in clients_to_close:
        await client.close()


def _get_container(name: str) -> ContainerProxy:
    container = _containers.get(name)
    if not container:
        raise RuntimeError(f'Container "{name}" not initialized. Call init_database() first.')
    return container


async def get_all(container_name: str) -> list[dict]:
    container = _get_container(container_name)
    items = []
    async for item in container.read_all_items():
        items.append(item)
    return items


async def get_all_by_troop(container_name: str, troop_id: str) -> list[dict]:
    container = _get_container(container_name)
    query = "SELECT * FROM c WHERE c.troopId = @troopId"
    params: list[dict] = [{"name": "@troopId", "value": troop_id}]
    items = []
    async for item in container.query_items(query=query, parameters=params):
        items.append(item)
    return items


async def get_by_id(container_name: str, item_id: str, partition_key_value: str | None = None) -> dict | None:
    container = _get_container(container_name)
    try:
        return await container.read_item(item_id, partition_key=partition_key_value or item_id)
    except Exception as exc:
        if getattr(exc, "status_code", None) == 404:
            return None
        raise


async def create_item(container_name: str, item: dict) -> dict:
    container = _get_container(container_name)
    return await container.create_item(item)


async def update_item(
    container_name: str,
    item_id: str,
    item: dict,
    partition_key_value: str | None = None,
    if_match: str | None = None,
) -> dict:
    container = _get_container(container_name)
    kwargs: dict = {"partition_key": partition_key_value or item_id}
    if if_match:
        kwargs["etag"] = if_match
        kwargs["match_condition"] = MatchConditions.IfNotModified
    return await container.replace_item(item_id, item, **kwargs)


async def delete_item(container_name: str, item_id: str, partition_key_value: str | None = None) -> None:
    container = _get_container(container_name)
    await container.delete_item(item_id, partition_key=partition_key_value or item_id)


async def query_items(container_name: str, query: str, parameters: list[dict] | None = None) -> list[dict]:
    container = _get_container(container_name)
    items = []
    async for item in container.query_items(query=query, parameters=parameters or []):
        items.append(item)
    return items


async def query_items_paginated(
    container_name: str,
    query: str,
    parameters: list[dict] | None = None,
    limit: int = 50,
    continuation_token: str | None = None,
) -> tuple[list[dict], str | None]:
    container = _get_container(container_name)
    pager = container.query_items(
        query=query,
        parameters=parameters or [],
        max_item_count=limit,
    ).by_page(continuation_token=continuation_token)

    items: list[dict] = []
    next_token: str | None = None

    async for page in pager:
        async for item in page:
            items.append(item)
        next_token = pager.continuation_token
        break

    return items, next_token
