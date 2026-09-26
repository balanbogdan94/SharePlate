param keyVaultName string
param postgresFqdn string
param postgresDatabaseName string
param postgresAdminLogin string

@secure()
param postgresAdminPassword string

resource existingKeyVault 'Microsoft.KeyVault/vaults@2026-02-01' existing = {
  name: keyVaultName
}

resource postgresConnectionSecret 'Microsoft.KeyVault/vaults/secrets@2026-02-01' = {
  parent: existingKeyVault
  name: 'PostgresConnectionString'
  properties: {
    value: 'Host=${postgresFqdn};Port=5432;Database=${postgresDatabaseName};Username=${postgresAdminLogin};Password=${postgresAdminPassword};Ssl Mode=Require;Trust Server Certificate=true'
  }
}
