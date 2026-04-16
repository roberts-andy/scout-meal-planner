import 'dotenv/config'
import { CosmosClient, Database, Container } from '@azure/cosmos'

const endpoint = process.env.COSMOS_ENDPOINT || 'https://localhost:8081/'
const key = process.env.COSMOS_KEY || 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=='
const databaseId = process.env.COSMOS_DATABASE || 'scout-meal-planner'
const useEmulator = process.env.COSMOS_EMULATOR === 'true'

// The emulator uses a self-signed certificate
if (useEmulator) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

const client = new CosmosClient({ endpoint, key })

let database: Database
let containers: Record<string, Container> = {}

const containerDefinitions = [
  { id: 'troops', partitionKey: '/id' },
  { id: 'members', partitionKey: '/troopId' },
  { id: 'events', partitionKey: '/troopId' },
  { id: 'recipes', partitionKey: '/troopId' },
  { id: 'feedback', partitionKey: '/troopId' },
]

export async function initDatabase(): Promise<void> {
  const { database: db } = await client.databases.createIfNotExists({ id: databaseId })
  database = db

  for (const def of containerDefinitions) {
    const { container } = await database.containers.createIfNotExists({
      id: def.id,
      partitionKey: { paths: [def.partitionKey] },
    })
    containers[def.id] = container
  }

  console.log(`Cosmos DB initialized: database="${databaseId}", containers=[${containerDefinitions.map(c => c.id).join(', ')}]`)
}

export function getContainer(name: string): Container {
  const container = containers[name]
  if (!container) {
    throw new Error(`Container "${name}" not initialized`)
  }
  return container
}

// Generic CRUD helpers

export async function getAll<T>(containerName: string): Promise<T[]> {
  const container = getContainer(containerName)
  const { resources } = await container.items.readAll<T>().fetchAll()
  return resources
}

export async function getAllByTroop<T>(containerName: string, troopId: string): Promise<T[]> {
  const container = getContainer(containerName)
  const { resources } = await container.items
    .query<T>({
      query: 'SELECT * FROM c WHERE c.troopId = @troopId',
      parameters: [{ name: '@troopId', value: troopId }],
    })
    .fetchAll()
  return resources
}

export async function getById<T>(containerName: string, id: string, partitionKeyValue?: string): Promise<T | undefined> {
  const container = getContainer(containerName)
  try {
    const { resource } = await container.item(id, partitionKeyValue ?? id).read<T>()
    return resource
  } catch (err: any) {
    if (err.code === 404) return undefined
    throw err
  }
}

export async function create<T extends { id: string }>(containerName: string, item: T): Promise<T> {
  const container = getContainer(containerName)
  const { resource } = await container.items.create<T>(item)
  return resource as T
}

export async function update<T extends { id: string }>(
  containerName: string,
  id: string,
  item: T,
  partitionKeyValue?: string
): Promise<T> {
  const container = getContainer(containerName)
  const { resource } = await container.item(id, partitionKeyValue ?? id).replace<T>(item)
  return resource as T
}

export async function remove(containerName: string, id: string, partitionKeyValue?: string): Promise<void> {
  const container = getContainer(containerName)
  await container.item(id, partitionKeyValue ?? id).delete()
}

export async function queryItems<T>(containerName: string, query: string, parameters?: { name: string; value: unknown }[]): Promise<T[]> {
  const container = getContainer(containerName)
  const { resources } = await container.items
    .query<T>({ query, parameters })
    .fetchAll()
  return resources
}
