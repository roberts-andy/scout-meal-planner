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

@description('Name of the App Service Plan')
param appServicePlanName string

@description('Name of the API Web App')
param apiAppName string

@description('Client ID of the pre-created Entra app registration for MSAL sign-in')
param entraClientId string

@description('Name of the Azure AI Content Safety account')
param contentSafetyAccountName string

@description('Name of the Azure Communication Services resource')
param communicationServiceName string

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
        paths: ['/id']
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
        paths: ['/id']
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
        paths: ['/eventId']
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

// App Service Plan — Linux B1
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  kind: 'linux'
  sku: {
    name: 'B1'
    tier: 'Basic'
  }
  properties: {
    reserved: true // Required for Linux
  }
}

// Web App — Python FastAPI
resource apiApp 'Microsoft.Web/sites@2023-12-01' = {
  name: apiAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.12'
      appCommandLine: 'uvicorn app.main:app --host 0.0.0.0 --port 8000'
      appSettings: [
        { name: 'COSMOS_ENDPOINT', value: cosmosAccount.properties.documentEndpoint }
        { name: 'COSMOS_DATABASE', value: cosmosDatabaseName }
        { name: 'ENTRA_CLIENT_ID', value: entraClientId }
        { name: 'CONTENT_SAFETY_ENDPOINT', value: contentSafety.properties.endpoint }
        { name: 'ACS_ENDPOINT', value: communicationService.properties.hostName }
        { name: 'ACS_FROM_EMAIL', value: 'DoNotReply@${emailDomain.properties.fromSenderDomain}' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'WEBSITES_PORT', value: '8000' }
      ]
    }
  }
}

// Cosmos DB Built-in Data Contributor role
var cosmosDataContributorRoleId = '00000000-0000-0000-0000-000000000002'

// Assign Cosmos DB data contributor role to Web App managed identity
resource cosmosRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmosAccount
  name: guid(cosmosAccount.id, apiApp.id, cosmosDataContributorRoleId)
  properties: {
    roleDefinitionId: '${cosmosAccount.id}/sqlRoleDefinitions/${cosmosDataContributorRoleId}'
    principalId: apiApp.identity.principalId
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

// Link Web App as SWA backend
resource swaBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: staticWebApp
  name: 'backend'
  properties: {
    backendResourceId: apiApp.id
    region: location
  }
}

// ── Azure AI Content Safety ──
resource contentSafety 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: contentSafetyAccountName
  location: location
  kind: 'ContentSafety'
  sku: {
    name: 'F0'
  }
  properties: {
    customSubDomainName: contentSafetyAccountName
    publicNetworkAccess: 'Enabled'
  }
}

// Cognitive Services User role for Web App managed identity
resource contentSafetyRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(contentSafety.id, apiApp.id, 'a97b65f3-24c7-4388-baec-2e87135dc908')
  scope: contentSafety
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')
    principalId: apiApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// ── Email Communication Services ──
resource emailService 'Microsoft.Communication/emailServices@2023-06-01-preview' = {
  name: '${communicationServiceName}-email'
  location: 'global'
  properties: {
    dataLocation: 'United States'
  }
}

// Azure-managed email domain (auto-provisioned sender address)
resource emailDomain 'Microsoft.Communication/emailServices/domains@2023-06-01-preview' = {
  parent: emailService
  name: 'AzureManagedDomain'
  location: 'global'
  properties: {
    domainManagement: 'AzureManaged'
  }
}

// ── Azure Communication Services (linked to Email domain) ──
resource communicationService 'Microsoft.Communication/communicationServices@2023-06-01-preview' = {
  name: communicationServiceName
  location: 'global'
  properties: {
    dataLocation: 'United States'
    linkedDomains: [
      emailDomain.id
    ]
  }
}

// Contributor role for Web App managed identity on ACS
resource acsRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(communicationService.id, apiApp.id, 'b24988ac-6180-42a0-ab88-20f7382dd24c')
  scope: communicationService
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c')
    principalId: apiApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output staticWebAppUrl string = staticWebApp.properties.defaultHostname
output cosmosAccountEndpoint string = cosmosAccount.properties.documentEndpoint
output apiAppName string = apiApp.name
output apiAppDefaultHostname string = apiApp.properties.defaultHostName
output entraClientId string = entraClientId
output contentSafetyEndpoint string = contentSafety.properties.endpoint
output acsEndpoint string = communicationService.properties.hostName
output acsFromEmail string = 'DoNotReply@${emailDomain.properties.fromSenderDomain}'
