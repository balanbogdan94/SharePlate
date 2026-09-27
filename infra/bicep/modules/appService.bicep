param planName string
param siteName string
param location string
param skuName string = 'B1'
param linuxFxVersion string = 'DOTNETCORE|10.0'
param keyVaultUri string
param appInsightsConnectionString string
param storageAccountUri string

resource appServicePlan 'Microsoft.Web/serverfarms@2024-11-01' = {
  name: planName
  location: location
  sku: {
    name: skuName
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource appService 'Microsoft.Web/sites@2025-03-01' = {
  name: siteName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      // Free tier (F1) doesn't support alwaysOn - deployment fails if forced on.
      alwaysOn: skuName != 'F1'
      appSettings: [
        {
          name: 'ConnectionStrings__DefaultConnection'
          value: '@Microsoft.KeyVault(SecretUri=${keyVaultUri}secrets/PostgresConnectionString)'
        }
        {
          // Exact name expected by both the codeless auto-instrumentation agent and the Azure Monitor SDKs.
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        {
          // Enables the App Insights site extension - what the Portal's "Turn on Application Insights" button does.
          name: 'ApplicationInsightsAgent_EXTENSION_VERSION'
          value: '~3'
        }
        {
          // No connection string/key here - BlobStorageService uses this URI with DefaultAzureCredential,
          // authorized via the Storage Blob Data Contributor role granted below.
          name: 'AzureStorage__AccountUri'
          value: storageAccountUri
        }
      ]
    }
  }
}

output id string = appService.id
output planId string = appServicePlan.id
output name string = appService.name
output defaultHostname string = appService.properties.defaultHostName
output principalId string = appService.identity.principalId
