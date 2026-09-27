param name string
@allowed(['westeurope', 'eastus2'])
param location string = 'westeurope'
param repositoryUrl string = 'https://github.com/balanbogdan94/SharePlate'
param branch string = 'main'

resource staticWebApp 'Microsoft.Web/staticSites@2025-03-01' = {
  name: name
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    // Matches the GitHub link already made manually in the Portal - kept here so redeploys
    // don't reset provider back to 'None' and break the connection. No repositoryToken: not
    // required for an already-linked repo, and we don't want a GitHub PAT stored in Bicep.
    provider: 'GitHub'
    repositoryUrl: repositoryUrl
    branch: branch
  }
}

output id string = staticWebApp.id
output name string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
