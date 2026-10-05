param location string
param tags object
param componentName string
param workspaceResourceId string

resource component 'Microsoft.Insights/components@2020-02-02' = {
  name: componentName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspaceResourceId
    DisableIpMasking: true
  }
}

output connectionString string = component.properties.ConnectionString
output componentId string = component.id
