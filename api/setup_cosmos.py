"""One-time script to create the Cosmos DB database and containers on the emulator."""
import asyncio
import os
import sys
from azure.cosmos.aio import CosmosClient

CONNECTION_STRING = os.environ.get("COSMOS_CONNECTION_STRING", "")
if not CONNECTION_STRING:
    sys.exit("Error: COSMOS_CONNECTION_STRING environment variable is not set.")
DATABASE_ID = "scout-meal-planner"
CONTAINERS = [
    {"id": "troops", "partition_key": "/id"},
    {"id": "members", "partition_key": "/troopId"},
    {"id": "events", "partition_key": "/troopId"},
    {"id": "share-tokens", "partition_key": "/shareToken"},
    {"id": "recipes", "partition_key": "/troopId"},
    {"id": "feedback", "partition_key": "/troopId"},
]


async def main():
    client = CosmosClient.from_connection_string(CONNECTION_STRING)
    try:
        db = await client.create_database_if_not_exists(DATABASE_ID)
        print(f'Database "{DATABASE_ID}" ready.')
        for defn in CONTAINERS:
            await db.create_container_if_not_exists(
                id=defn["id"],
                partition_key={"paths": [defn["partition_key"]], "kind": "Hash"},
            )
            print(f'  Container "{defn["id"]}" (partition key: {defn["partition_key"]}) ready.')
        print("\nAll done!")
    finally:
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
