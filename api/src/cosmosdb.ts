import { CosmosClient, Database, Container, ItemDefinition, JSONValue } from '@azure/cosmos'

const connectionString = process.env.COSMOS_CONNECTION_STRING
const databaseId = process.env.COSMOS_DATABASE || 'scout-meal-planner'

if (!connectionString) {
  throw new Error('COSMOS_CONNECTION_STRING environment variable is required')
}

const client = new CosmosClient(connectionString)

let database: Database
let containers: Record<string, Container> = {}

const containerDefinitions = [
  { id: 'events', partitionKey: '/id' },
  { id: 'recipes', partitionKey: '/id' },
  { id: 'feedback', partitionKey: '/eventId' },
]

let initialized = false

export async function initDatabase(): Promise<void> {
  if (initialized) return

  const { database: db } = await client.databases.createIfNotExists({ id: databaseId })
  database = db

  for (const def of containerDefinitions) {
    const { container } = await database.containers.createIfNotExists({
      id: def.id,
      partitionKey: { paths: [def.partitionKey] },
    })
    containers[def.id] = container
  }

  initialized = true
}

function getContainer(name: string): Container {
  const container = containers[name]
  if (!container) {
    throw new Error(`Container "${name}" not initialized. Call initDatabase() first.`)
  }
  return container
}

export async function getAll<T extends ItemDefinition>(containerName: string): Promise<T[]> {
  await initDatabase()
  const container = getContainer(containerName)
  const { resources } = await container.items.readAll<T>().fetchAll()
  return resources as T[]
}

export async function getById<T extends ItemDefinition>(containerName: string, id: string, partitionKeyValue?: string): Promise<T | undefined> {
  await initDatabase()
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
  await initDatabase()
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
  await initDatabase()
  const container = getContainer(containerName)
  const { resource } = await container.item(id, partitionKeyValue ?? id).replace<T>(item)
  return resource as T
}

export async function remove(containerName: string, id: string, partitionKeyValue?: string): Promise<void> {
  await initDatabase()
  const container = getContainer(containerName)
  await container.item(id, partitionKeyValue ?? id).delete()
}

export async function queryItems<T>(containerName: string, query: string, parameters?: { name: string; value: JSONValue }[]): Promise<T[]> {
  await initDatabase()
  const container = getContainer(containerName)
  const { resources } = await container.items
    .query<T>({ query, parameters })
    .fetchAll()
  return resources
}
