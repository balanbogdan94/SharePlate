param appServiceName string
param staticWebAppName string
param principalId string

resource existingAppService 'Microsoft.Web/sites@2024-11-01' existing = {
  name: appServiceName
}

resource existingStaticWebApp 'Microsoft.Web/staticSites@2025-03-01' existing = {
  name: staticWebAppName
}

resource websiteContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(existingAppService.id, principalId, 'WebsiteContributor')
  scope: existingAppService
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'de139f84-1756-47ae-9be6-808fbbe84772'
    )
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

resource staticWebAppContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(existingStaticWebApp.id, principalId, 'Contributor')
  scope: existingStaticWebApp
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b24988ac-6180-42a0-ab88-20f7382dd24c'
    )
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
