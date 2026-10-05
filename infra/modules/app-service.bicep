param location string
param tags object
param appServicePlanId string
param appServiceName string
param adminEmail string

@secure()
param adminPassword string

@secure()
param sessionSecret string

param appInsightsConnectionString string

resource appService 'Microsoft.Web/sites@2023-12-01' = {
  name: appServiceName
  location: location
  kind: 'app,windows'
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlanId
    httpsOnly: true
    siteConfig: {
      windowsFxVersion: 'NODE|20-lts'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/api/health'
      alwaysOn: false
      appSettings: [
        { name: 'ADMIN_EMAIL', value: adminEmail }
        { name: 'ADMIN_PASSWORD', value: adminPassword }
        { name: 'SESSION_SECRET', value: sessionSecret }
        { name: 'NODE_ENV', value: 'production' }
        { name: 'DATA_DIR', value: 'D:\\home\\pid-facilities-data' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'ENABLE_ORYX_BUILD', value: 'true' }
        { name: 'ORYX_DISABLE_COMPRESSION', value: 'true' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '20-lts' }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsightsConnectionString }
      ]
    }
  }
}

resource scmAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2023-12-01' = {
  parent: appService
  name: 'scm'
  properties: {
    allow: true
  }
}

resource ftpAuth 'Microsoft.Web/sites/basicPublishingCredentialsPolicies@2023-12-01' = {
  parent: appService
  name: 'ftp'
  properties: {
    allow: false
  }
}

output appServiceId string = appService.id
output appServiceName string = appService.name
output defaultHostName string = appService.properties.defaultHostName
output principalId string = appService.identity.principalId
