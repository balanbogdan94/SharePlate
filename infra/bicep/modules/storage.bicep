param name string
param location string

resource storageAccount 'Microsoft.Storage/storageAccounts@2026-04-01' = {
  name: name
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    allowBlobPublicAccess: true
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: 'Enabled'
    accessTier: 'Hot'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2026-04-01' = {
  name: 'default'
  parent: storageAccount
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    containerDeleteRetentionPolicy: { allowPermanentDelete: true, days: 7, enabled: true }
  }
}

resource rawRecipeImages 'Microsoft.Storage/storageAccounts/blobServices/containers@2026-04-01' = {
  name: 'recipe-images-raw'
  parent: blobService
  properties: {
    publicAccess: 'None'
  }
}

resource processedRecipeImages 'Microsoft.Storage/storageAccounts/blobServices/containers@2026-04-01' = {
  name: 'recipe-images'
  parent: blobService
  properties: {
    publicAccess: 'Blob'
  }
}

resource userImages 'Microsoft.Storage/storageAccounts/blobServices/containers@2026-04-01' = {
  name: 'user-images'
  parent: blobService
  properties: {
    publicAccess: 'Blob'
  }
}

output id string = storageAccount.id
output name string = storageAccount.name
output blobEndpoint string = storageAccount.properties.primaryEndpoints.blob
