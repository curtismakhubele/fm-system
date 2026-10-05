targetScope = 'subscription'

@minLength(1)
@maxLength(64)
param environmentName string

@minLength(1)
param location string

param sessionId string
param deployedBy string
param createdAt string
param adminEmail string

@secure()
param adminPassword string

@secure()
param sessionSecret string

var tags = {
  'app-onboard-skill': 'true'
  'app-onboard-session-id': sessionId
  'created-at': createdAt
  environment: environmentName
  'deployed-by': deployedBy
}

resource resourceGroup 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-pid-facilities-management-dev'
  location: location
  tags: tags
}

module appServicePlan './modules/app-service-plan.bicep' = {
  name: 'app-service-plan'
  scope: resourceGroup
  params: {
    location: location
    tags: tags
    planName: 'plan-pid-facilities-management-dev'
  }
}

module logAnalytics './modules/log-analytics.bicep' = {
  name: 'log-analytics'
  scope: resourceGroup
  params: {
    location: location
    tags: tags
    workspaceName: 'log-pid-facilities-management-dev'
  }
}

module applicationInsights './modules/application-insights.bicep' = {
  name: 'application-insights'
  scope: resourceGroup
  params: {
    location: location
    tags: tags
    componentName: 'appi-pid-facilities-management-dev'
    workspaceResourceId: logAnalytics.outputs.workspaceId
  }
}

module appService './modules/app-service.bicep' = {
  name: 'app-service'
  scope: resourceGroup
  params: {
    location: location
    tags: tags
    appServicePlanId: appServicePlan.outputs.planId
    appServiceName: 'pidmms'
    adminEmail: adminEmail
    adminPassword: adminPassword
    sessionSecret: sessionSecret
    appInsightsConnectionString: applicationInsights.outputs.connectionString
  }
}

output resourceGroupName string = resourceGroup.name
output appServiceName string = appService.outputs.appServiceName
output appServiceHostname string = appService.outputs.defaultHostName
output appServicePrincipalId string = appService.outputs.principalId
