# Pro-PID Facilities Management - Azure Deployment Guide

## Overview
This guide provides step-by-step instructions to deploy the Pro-PID Facilities Management application to Azure App Service.

**Deployment Target:**
- App Service Name: `your-app-name`
- Resource Group: `rg-pid-facilities-management`
- Subscription: `<subscription-id>`
- Runtime: Node.js 20 LTS
- App Service tier: F1 Free (Windows)

## Prerequisites

### 1. Install Azure CLI
Azure CLI is required for deployment. Install it from one of these methods:

**Option A: Using Windows Installer (Recommended)**
- Download from: https://aka.ms/installazurecliwindows
- Run the MSI installer and follow the prompts
- Close and reopen PowerShell after installation

**Option B: Using Windows Package Manager**
```powershell
winget install Microsoft.AzureCLI
```

**Option C: Using Python (if pip is available)**
```powershell
pip install azure-cli
```

### 2. Verify Installation
After installation, verify Azure CLI is accessible:
```powershell
az --version
```

## Deployment Steps

### Step 1: Authenticate to Azure
```powershell
az login
```
A browser will open for authentication. Sign in with your Azure account.

### Step 2: Set the Subscription
```powershell
az account set --subscription <subscription-id>
```

### Step 3: Verify the App Service Exists
```powershell
az webapp show --resource-group rg-pid-facilities-management --name your-app-name
```

### Step 4: Configure App Settings
Before deployment, set the required environment variables:

```powershell
# Generate a secure SESSION_SECRET (base64-encoded 48 random bytes)
$randomBytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
$sessionSecret = [Convert]::ToBase64String($randomBytes)

# Set app configuration
az webapp config appsettings set `
  --resource-group rg-pid-facilities-management `
  --name your-app-name `
  --settings `
    NODE_ENV=production `
    DATA_DIR='D:\home\pid-facilities-data' `
    SESSION_SECRET="$sessionSecret" `
    ADMIN_EMAIL="admin@example.com" `
    ADMIN_PASSWORD="<your-admin-password>"

# Enable HTTPS only
az webapp update `
  --resource-group rg-pid-facilities-management `
  --name your-app-name `
  --set httpsOnly=true
```

**Important:** Replace `<your-admin-password>` with a strong password. This password will be used to log in to the application.

### Step 5: Deploy the ZIP File
```powershell
$zipPath = "C:\Users\makhuc\OneDrive - University of South Africa\workstation\pro app FM\Pro-PID-facilities-management\pid-facilities-management-azure.zip"

az webapp deploy `
  --resource-group rg-pid-facilities-management `
  --name your-app-name `
  --src-path $zipPath `
  --type zip
```

The deployment will take a few minutes. Monitor the progress in the terminal.

### Step 6: Verify Deployment
```powershell
# Check the app service state
az webapp show --resource-group rg-pid-facilities-management --name your-app-name --query state

# View recent deployments
az webapp deployment list --resource-group rg-pid-facilities-management --name your-app-name --query "[0:5]" --output table
```

### Step 7: Test the Application
1. Open your browser and navigate to: `https://your-app-name.azurewebsites.net`
2. Log in with:
   - **Email:** admin@example.com
   - **Password:** (the password you set above)

## Troubleshooting

### Application Not Starting
Check the application logs:
```powershell
az webapp log tail --resource-group rg-pid-facilities-management --name your-app-name
```

### Deployment Failed
Check deployment status:
```powershell
az webapp deployment show --resource-group rg-pid-facilities-management --name your-app-name --slot-name "production"
```

### View App Service Configuration
```powershell
# View current app settings
az webapp config appsettings list --resource-group rg-pid-facilities-management --name your-app-name

# View connection strings and other config
az webapp config show --resource-group rg-pid-facilities-management --name your-app-name
```

## Important Notes

1. **Data Storage**: The application stores data at `D:\home\pid-facilities-data`, which is separate from the deployed package. This ensures data persistence across deployments.

2. **Package Structure**: The ZIP file (`pid-facilities-management-azure.zip`) includes:
   - Node.js source code
   - node_modules dependencies
   - Does NOT include `.env` files or existing data

3. **Scaling**: This deployment uses a single instance App Service. If you need to scale to multiple instances, migrate to Azure Database for PostgreSQL or Cosmos DB first.

4. **Environment Variables Required**:
   - `SESSION_SECRET`: Minimum 32 characters (required)
   - `ADMIN_EMAIL`: Administrator email (required)
   - `ADMIN_PASSWORD`: Administrator password (required)
   - `NODE_ENV`: Set to "production"
  - `DATA_DIR`: Set to "D:\\home\\pid-facilities-data"

## Monitoring and Management

### Enable Application Insights (Recommended)
```powershell
az webapp config appsettings set `
  --resource-group rg-pid-facilities-management `
  --name your-app-name `
  --settings `
    APPINSIGHTS_INSTRUMENTATIONKEY="<your-instrumentation-key>" `
    ApplicationInsightsAgent_EXTENSION_VERSION="~3"
```

### View Application Metrics
In Azure Portal:
1. Go to Resource Group "rg-pid-facilities-management"
2. Click on App Service "your-app-name"
3. Navigate to "Metrics" section
4. View CPU, Memory, and HTTP metrics

### Enable Continuous Deployment
```powershell
# Configure Git-based continuous deployment
az webapp config appsettings set `
  --resource-group rg-pid-facilities-management `
  --name your-app-name `
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=false
```

## Additional Resources

- [Azure App Service Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [Azure CLI Web App Commands](https://learn.microsoft.com/en-us/cli/azure/webapp)
- [Node.js on Azure App Service](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs)
