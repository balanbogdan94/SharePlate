param name string
param location string
param retentionInDays int = 30

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2026-03-01' = {
  name: name
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionInDays
  }
}

output id string = logAnalytics.id
output name string = logAnalytics.name
