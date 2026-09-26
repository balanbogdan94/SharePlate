param appServiceId string
param appServicePlanId string
param postgresServerId string
param actionGroupId string

resource http5xxAlert 'Microsoft.Insights/metricAlerts@2026-01-01' = {
  name: 'alert-appservice-http5xx'
  location: 'global'
  properties: {
    severity: 2
    enabled: true
    scopes: [
      appServiceId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Http5xxCount'
          metricName: 'Http5xx'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThan'
          threshold: 5
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroupId
      }
    ]
  }
}

resource cpuHighAlert 'Microsoft.Insights/metricAlerts@2026-01-01' = {
  name: 'alert-appservice-cpu-high'
  location: 'global'
  properties: {
    severity: 3
    enabled: true
    scopes: [
      appServicePlanId
    ]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT15M'
    autoMitigate: true
    targetResourceType: 'Microsoft.Web/serverFarms'
    targetResourceRegion: 'austriaeast'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          operator: 'GreaterThan'
          threshold: json('80')
          name: 'Metric1'
          metricNamespace: 'Microsoft.Web/serverFarms'
          metricName: 'CpuPercentage'
          dimensions: []
          timeAggregation: 'Average'
          skipMetricValidation: false
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroupId
      }
    ]
  }
}

resource postgresStorageAlert 'Microsoft.Insights/metricAlerts@2026-01-01' = {
  name: 'alert-postgres-storage-high'
  location: 'global'
  properties: {
    severity: 2
    enabled: true
    scopes: [
      postgresServerId
    ]
    evaluationFrequency: 'PT15M'
    windowSize: 'PT30M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'StoragePercent'
          metricName: 'storage_percent'
          metricNamespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
          operator: 'GreaterThan'
          threshold: 85
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroupId
      }
    ]
  }
}
