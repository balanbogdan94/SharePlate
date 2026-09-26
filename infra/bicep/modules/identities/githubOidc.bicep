param name string
param location string
param githubOrg string = 'balanbogdan94'
param githubOrgId string = '12782838'
param githubRepo string = 'SharePlate'
param githubRepoId string = '1158754288'

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
      // Anchored on immutable GitHub IDs (owner@ownerId/repo@repoId), matching what the
      // Portal's "GitHub Actions deploying Azure resources" wizard generates - prevents
      // subject-confusion attacks if the org/repo is ever renamed.
      subject: 'repo:${githubOrg}@${githubOrgId}/${githubRepo}@${githubRepoId}:ref:refs/heads/${branch}'
      audiences: [
        'api://AzureADTokenExchange'
      ]
    }
  }
]

output principalId string = identity.properties.principalId
output clientId string = identity.properties.clientId
output tenantId string = identity.properties.tenantId
