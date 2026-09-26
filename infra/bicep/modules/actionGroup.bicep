param name string
param emailAddress string

resource actionGroup 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: name
  location: 'global'
  properties: {
    groupShortName: take(name, 12)
    enabled: true
    emailReceivers: [
      {
        name: 'PrimaryOnCall'
        emailAddress: emailAddress
        useCommonAlertSchema: true
      }
    ]
  }
}

output id string = actionGroup.id
