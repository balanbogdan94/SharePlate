targetScope = 'resourceGroup'

var appName = 'sharePlate'

param environmentName string
param location string
@secure()
param postgresAdminPassword string

var storageAccountName = toLower('${appName}${environmentName}storage')
var keyVaultName = '${appName}-${environmentName}-keyvault'
var appServiceSiteName = '${appName}-${environmentName}-api'

module logAnalytics './modules/logAnalytics.bicep' = {
  params: {
    name: '${appName}-${environmentName}-logAnalytics'
    location: location
    retentionInDays: 30
  }
}

module appInsights './modules/appInsights.bicep' = {
  params: {
    name: '${appName}-${environmentName}-appInsights'
    location: location
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

module storage './modules/storage.bicep' = {
  params: {
    name: storageAccountName
    location: location
  }
}

module webapp 'modules/staticWebApp.bicep' = {
  params: {
    name: '${appName}-${environmentName}-webApp'
  }
}

module postgres './modules/postgres.bicep' = {
  params: {
    name: '${appName}-${environmentName}-postgres'
    location: location
    administratorLoginPassword: postgresAdminPassword
  }
}

module keyVault './modules/keyVault.bicep' = {
  params: {
    name: keyVaultName
    location: location
  }
}

module keyVaultSecrets './modules/keyVaultSecrets.bicep' = {
  params: {
    keyVaultName: keyVaultName
    postgresFqdn: postgres.outputs.fqdn
    postgresDatabaseName: postgres.outputs.databaseName
    postgresAdminLogin: postgres.outputs.administratorLogin
    postgresAdminPassword: postgresAdminPassword
  }
  dependsOn: [
    keyVault
  ]
}

module appService './modules/appService.bicep' = {
  params: {
    planName: '${appName}-${environmentName}-plan'
    siteName: appServiceSiteName
    location: location
    keyVaultUri: keyVault.outputs.uri
  }
  dependsOn: [
    keyVaultSecrets
  ]
}

module roleAssignments './modules/roleAssignments.bicep' = {
  params: {
    keyVaultName: keyVaultName
    storageAccountName: storageAccountName
    principalId: appService.outputs.principalId
  }
  dependsOn: [
    storage
  ]
}
