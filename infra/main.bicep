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

@description('Name of the App Service Plan')
param appServicePlanName string = 'plan-scout-meal-planner'

@description('Name of the API Web App')
param apiAppName string = 'app-scout-meal-planner-api'

@description('Name of the Azure AI Content Safety account')
param contentSafetyAccountName string = 'cs-scout-meal-planner'

@description('Name of the Azure Communication Services resource')
param communicationServiceName string = 'acs-scout-meal-planner'

@description('Name of the Log Analytics workspace')
param logAnalyticsName string = 'log-scout-meal-planner'

@description('Name of the Application Insights resource')
param appInsightsName string = 'ai-scout-meal-planner'

@description('Client ID of the pre-created Entra app registration for MSAL sign-in')
param entraClientId string = '42871bb7-a693-4d97-9cb9-69bbf9a50ff4'

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
    appServicePlanName: appServicePlanName
    apiAppName: apiAppName
    entraClientId: entraClientId
    contentSafetyAccountName: contentSafetyAccountName
    communicationServiceName: communicationServiceName
    logAnalyticsName: logAnalyticsName
    appInsightsName: appInsightsName
  }
}

output staticWebAppUrl string = resources.outputs.staticWebAppUrl
output cosmosAccountEndpoint string = resources.outputs.cosmosAccountEndpoint
output apiAppName string = resources.outputs.apiAppName
output apiAppDefaultHostname string = resources.outputs.apiAppDefaultHostname
output entraClientId string = resources.outputs.entraClientId
output contentSafetyEndpoint string = resources.outputs.contentSafetyEndpoint
output acsEndpoint string = resources.outputs.acsEndpoint
output acsFromEmail string = resources.outputs.acsFromEmail
output appInsightsConnectionString string = resources.outputs.appInsightsConnectionString
