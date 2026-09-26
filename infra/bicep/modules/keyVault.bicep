param name string
param location string
param tenantId string = subscription().tenantId
param softDeleteRetentionInDays int = 90
param enablePurgeProtection bool = true

resource keyVault 'Microsoft.KeyVault/vaults@2026-02-01' = {
  name: name
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableSoftDelete: true
    enablePurgeProtection: enablePurgeProtection
    softDeleteRetentionInDays: softDeleteRetentionInDays
    tenantId: tenantId
    enableRbacAuthorization: true
  }
}

output id string = keyVault.id
output name string = keyVault.name
output uri string = keyVault.properties.vaultUri
