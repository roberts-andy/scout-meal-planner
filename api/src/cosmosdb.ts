import { CosmosClient, Database, Container, ItemDefinition, JSONValue } from '@azure/cosmos'
import { DefaultAzureCredential } from '@azure/identity'

const endpoint = process.env.COSMOS_ENDPOINT
const connectionString = process.env.COSMOS_CONNECTION_STRING
const databaseId = process.env.COSMOS_DATABASE || 'scout-meal-planner'

if (!endpoint && !connectionString) {
  console.warn('WARNING: Neither COSMOS_ENDPOINT nor COSMOS_CONNECTION_STRING is set. Database calls will fail.')
}

const client = (endpoint || connectionString)
  ? (endpoint
      ? new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() })
      : new CosmosClient(connectionString!))
  : null as unknown as CosmosClient

let database: Database
let containers: Record<string, Container> = {}

const containerDefinitions = [
  { id: 'troops', partitionKey: '/id' },
  { id: 'members', partitionKey: '/troopId' },
  { id: 'events', partitionKey: '/troopId' },
  { id: 'recipes', partitionKey: '/troopId' },
  { id: 'feedback', partitionKey: '/troopId' },
]

let initialized = false

/** Seed data: pre-configured troops and members created on first startup */
const seedTroops = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Troop 1 Bolton',
    inviteCode: 'TROOP-B01T',
    createdBy: 'seed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]

const seedMembers = [
  {
    id: '00000000-0000-0000-0000-00000000000A',
    troopId: '00000000-0000-0000-0000-000000000001',
    userId: '',
    email: 'roberts_andy@hotmail.com',
    displayName: 'Andy Roberts',
    role: 'troopAdmin',
    status: 'active',
    joinedAt: Date.now(),
  },
]

async function seedDatabase(): Promise<void> {
  try {
    for (const troop of seedTroops) {
      try {
        await containers['troops'].item(troop.id, troop.id).read()
      } catch (err: any) {
        if (err.code === 404) {
          await containers['troops'].items.create(troop)
          console.log(`Seeded troop: ${troop.name}`)
        }
      }
    }

    for (const member of seedMembers) {
      try {
        await containers['members'].item(member.id, member.troopId).read()
      } catch (err: any) {
        if (err.code === 404) {
          await containers['members'].items.create(member)
          console.log(`Seeded member: ${member.email} as ${member.role}`)
        }
      }
    }
  } catch (err) {
    console.warn('Seed database failed (non-fatal):', err)
  }
}

export async function initDatabase(): Promise<void> {
  if (initialized) return

  if (!endpoint && !connectionString) {
    throw new Error('Either COSMOS_ENDPOINT or COSMOS_CONNECTION_STRING environment variable is required')
  }

  const { database: db } = await client.databases.createIfNotExists({ id: databaseId })
  database = db

  for (const def of containerDefinitions) {
    const { container } = await database.containers.createIfNotExists({
      id: def.id,
      partitionKey: { paths: [def.partitionKey] },
    })
    containers[def.id] = container
  }

  await seedDatabase()

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

export async function getAllByTroop<T extends ItemDefinition>(containerName: string, troopId: string): Promise<T[]> {
  await initDatabase()
  const container = getContainer(containerName)
  const { resources } = await container.items
    .query<T>({
      query: 'SELECT * FROM c WHERE c.troopId = @troopId',
      parameters: [{ name: '@troopId', value: troopId }],
    })
    .fetchAll()
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
