targetScope = 'resourceGroup'

var appName = 'sharePlate'

param environmentName string
param location string
@secure()
param postgresAdminPassword string
param alertEmailAddress string

var storageAccountName = toLower('${appName}${environmentName}storage')
var keyVaultName = '${appName}-${environmentName}-keyvault'
var appServiceSiteName = '${appName}-${environmentName}-api'
var staticWebAppName = '${appName}-${environmentName}-webApp'
var managedIdentityName = '${appName}-${environmentName}-managedIdentity'

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
    name: staticWebAppName
  }
}

module postgres './modules/postgres.bicep' = {
  params: {
    name: toLower('${appName}-${environmentName}-postgres')
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
    appInsightsConnectionString: appInsights.outputs.connectionString
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

module actionGroup './modules/actionGroup.bicep' = {
  params: {
    name: '${appName}-${environmentName}-ag'
    emailAddress: alertEmailAddress
  }
}

module alerts './modules/alerts.bicep' = {
  params: {
    appServiceId: appService.outputs.id
    appServicePlanId: appService.outputs.planId
    postgresServerId: postgres.outputs.id
    actionGroupId: actionGroup.outputs.id
  }
}

module githubOidc './modules/identities/githubOidc.bicep' = {
  params: {
    name: managedIdentityName
    location: location
  }
}

module githubOidcRoleAssignments './modules/identities/githubOidcRoleAssignments.bicep' = {
  params: {
    appServiceName: appServiceSiteName
    staticWebAppName: staticWebAppName
    principalId: githubOidc.outputs.principalId
  }
  dependsOn: [
    appService
    webapp
  ]
}
