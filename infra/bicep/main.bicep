targetScope = 'subscription'

@description('The environment name for the deployment.')
@allowed(['dev', 'prod'])
param environmentName string

@description('The location for the deployment.')
param location string = 'austriaeast'

resource rg 'Microsoft.Resources/resourceGroups@2025-04-01' = {
  name: 'rg-shareplate-${environmentName}'
  location: location
}

@secure()
param postgresAdminPassword string

module resources 'resources.bicep' = {
  name: 'resources'
  scope: resourceGroup(rg.name)
  params: {
    environmentName: environmentName
    location: location
    postgresAdminPassword: postgresAdminPassword
  }
}
