targetScope = 'subscription'

@description('Name of the resource group')
param resourceGroupName string = 'rg-scout-meal-planner'

@description('Azure region for all resources')
param location string = 'centralus'

@description('Name of the Cosmos DB account')
param cosmosAccountName string = 'cosmos-scout-meal-planner'

@description('Name of the Static Web App')
param staticWebAppName string = 'swa-scout-meal-planner'

@description('Name of the Cosmos DB database')
param cosmosDatabaseName string = 'scout-meal-planner'

@description('GitHub repository URL for SWA deployment')
param repositoryUrl string = ''

@description('GitHub branch for SWA deployment')
param repositoryBranch string = 'main'

@description('Name of the Function App')
param functionAppName string = 'func-scout-meal-planner'

@description('Name of the Storage Account for Function App')
param storageAccountName string = 'stscoutmealplanner'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
}

module resources 'resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    location: location
    cosmosAccountName: cosmosAccountName
    staticWebAppName: staticWebAppName
    cosmosDatabaseName: cosmosDatabaseName
    repositoryUrl: repositoryUrl
    repositoryBranch: repositoryBranch
    functionAppName: functionAppName
    storageAccountName: storageAccountName
  }
}

output staticWebAppUrl string = resources.outputs.staticWebAppUrl
output cosmosAccountEndpoint string = resources.outputs.cosmosAccountEndpoint
output functionAppName string = resources.outputs.functionAppName
