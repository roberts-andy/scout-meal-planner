extension 'br:mcr.microsoft.com/bicep/extensions/microsoftgraph/v1.0:0.1.8-preview'

@description('Azure region for all resources')
param location string

@description('Name of the Cosmos DB account')
param cosmosAccountName string

@description('Name of the Static Web App')
param staticWebAppName string

@description('Name of the Cosmos DB database')
param cosmosDatabaseName string

@description('GitHub repository URL')
param repositoryUrl string

@description('GitHub branch')
param repositoryBranch string

@description('Name of the Function App')
param functionAppName string

@description('Name of the Storage Account for Function App')
param storageAccountName string

@description('Object ID of the GitHub Actions service principal for deployment')
param deployerPrincipalId string = ''

@description('Display name for the MSA sign-in app registration')
param msaAppDisplayName string = 'ScoutMealPlanner'

@description('Maximum instance count for Flex Consumption scaling')
param maximumInstanceCount int = 100

@description('Instance memory in MB for Flex Consumption')
@allowed([512, 2048, 4096])
param instanceMemoryMB int = 2048

// Cosmos DB Account — Serverless
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosAccountName
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
  }
}

// Cosmos DB Database
resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: cosmosDatabaseName
  properties: {
    resource: {
      id: cosmosDatabaseName
    }
  }
}

// Container: events
resource eventsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'events'
  properties: {
    resource: {
      id: 'events'
      partitionKey: {
        paths: ['/troopId']
        kind: 'Hash'
      }
    }
  }
}

// Container: recipes
resource recipesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'recipes'
  properties: {
    resource: {
      id: 'recipes'
      partitionKey: {
        paths: ['/troopId']
        kind: 'Hash'
      }
    }
  }
}

// Container: feedback
resource feedbackContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'feedback'
  properties: {
    resource: {
      id: 'feedback'
      partitionKey: {
        paths: ['/troopId']
        kind: 'Hash'
      }
    }
  }
}

// Container: troops
resource troopsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'troops'
  properties: {
    resource: {
      id: 'troops'
      partitionKey: {
        paths: ['/id']
        kind: 'Hash'
      }
    }
  }
}

// Container: members
resource membersContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'members'
  properties: {
    resource: {
      id: 'members'
      partitionKey: {
        paths: ['/troopId']
        kind: 'Hash'
      }
    }
  }
}

// Deployment container name for Flex Consumption
var deploymentStorageContainerName = 'app-package-${take(functionAppName, 32)}'

// Storage Account for Function App
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
  }
}

// Blob services
resource blobServices 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storageAccount
  name: 'default'
}

// Deployment blob container for Flex Consumption
resource deployContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobServices
  name: deploymentStorageContainerName
}

// App Service Plan — Flex Consumption
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${functionAppName}-plan'
  location: location
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true
  }
}

// Function App — Flex Consumption with managed identity
resource functionApp 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storageAccount.properties.primaryEndpoints.blob}${deploymentStorageContainerName}'
          authentication: {
            type: 'SystemAssignedIdentity'
          }
        }
      }
      scaleAndConcurrency: {
        maximumInstanceCount: maximumInstanceCount
        instanceMemoryMB: instanceMemoryMB
      }
      runtime: {
        name: 'node'
        version: '22'
      }
    }
    siteConfig: {
      appSettings: [
        { name: 'AzureWebJobsStorage__credential', value: 'managedidentity' }
        { name: 'AzureWebJobsStorage__blobServiceUri', value: 'https://${storageAccount.name}.blob.${environment().suffixes.storage}' }
        { name: 'AzureWebJobsStorage__queueServiceUri', value: 'https://${storageAccount.name}.queue.${environment().suffixes.storage}' }
        { name: 'AzureWebJobsStorage__tableServiceUri', value: 'https://${storageAccount.name}.table.${environment().suffixes.storage}' }
        { name: 'COSMOS_ENDPOINT', value: cosmosAccount.properties.documentEndpoint }
        { name: 'COSMOS_DATABASE', value: cosmosDatabaseName }
        { name: 'ENTRA_CLIENT_ID', value: msaApp.appId }
      ]
    }
    httpsOnly: true
  }
}

// Cosmos DB Built-in Data Contributor role
var cosmosDataContributorRoleId = '00000000-0000-0000-0000-000000000002'

// Storage RBAC roles for Function App managed identity
// Storage Blob Data Owner
resource storageBlobRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionApp.id, 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Storage Queue Data Contributor
resource storageQueueRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionApp.id, '974c5e8b-45b9-4653-ba55-5f855dd0fb88')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '974c5e8b-45b9-4653-ba55-5f855dd0fb88')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Storage Table Data Contributor
resource storageTableRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storageAccount.id, functionApp.id, '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Storage Blob Data Contributor for deployer SP (to upload deployment packages)
resource deployerBlobRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployerPrincipalId != '') {
  name: guid(storageAccount.id, deployerPrincipalId, 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
  scope: storageAccount
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
    principalId: deployerPrincipalId
    principalType: 'ServicePrincipal'
  }
}

// Assign Cosmos DB data contributor role to Function App managed identity
resource cosmosRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmosAccount
  name: guid(cosmosAccount.id, functionApp.id, cosmosDataContributorRoleId)
  properties: {
    roleDefinitionId: '${cosmosAccount.id}/sqlRoleDefinitions/${cosmosDataContributorRoleId}'
    principalId: functionApp.identity.principalId
    scope: cosmosAccount.id
  }
}

// Static Web App — Standard tier (required for linked backends)
resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: repositoryUrl != '' ? repositoryUrl : null
    branch: repositoryUrl != '' ? repositoryBranch : null
    buildProperties: {
      appLocation: '/'
      outputLocation: 'dist'
    }
  }
}

// Link Function App as SWA backend
resource swaBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: staticWebApp
  name: 'backend'
  properties: {
    backendResourceId: functionApp.id
    region: location
  }
}

// ── App Registration: MSA sign-in (Personal Microsoft Accounts only) ──
resource msaApp 'Microsoft.Graph/applications@v1.0' = {
  uniqueName: msaAppDisplayName
  displayName: msaAppDisplayName
  signInAudience: 'PersonalMicrosoftAccount'
  spa: {
    redirectUris: [
      'http://localhost:5000'
      'https://${staticWebApp.properties.defaultHostname}'
    ]
  }
}

output staticWebAppUrl string = staticWebApp.properties.defaultHostname
output cosmosAccountEndpoint string = cosmosAccount.properties.documentEndpoint
output functionAppName string = functionApp.name
output msaAppClientId string = msaApp.appId
