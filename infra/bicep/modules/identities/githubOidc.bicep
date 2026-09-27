param name string
param location string
param githubOrg string = 'balanbogdan94'
param githubRepo string = 'SharePlate'

@description('Branches allowed to authenticate as this identity via GitHub OIDC, e.g. [\'main\'] or [\'main\', \'release\']')
param allowedBranches array = ['main']

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2024-11-30' = {
  name: name
  location: location
}

resource federatedCredentials 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2024-11-30' = [
  for branch in allowedBranches: {
    parent: identity
    name: 'github-${branch}'
    properties: {
      issuer: 'https://token.actions.githubusercontent.com'
      // Plain owner/repo format - confirmed by an actual failed login that GitHub's real
      // OIDC token subject does NOT include the numeric IDs the Portal wizard suggested.
      subject: 'repo:${githubOrg}/${githubRepo}:ref:refs/heads/${branch}'
      audiences: [
        'api://AzureADTokenExchange'
      ]
    }
  }
]

output principalId string = identity.properties.principalId
output clientId string = identity.properties.clientId
output tenantId string = identity.properties.tenantId
