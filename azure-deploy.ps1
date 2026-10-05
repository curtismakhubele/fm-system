<#
Deploy PID Facilities Management to Azure App Service.
Requires Azure CLI, an Azure subscription, and the deployment ZIP in this folder.
Example:
  .\azure-deploy.ps1 -SubscriptionId '<subscription-id>' -ResourceGroup 'rg-pid-fms' -AppName 'pid-fms-your-unique-name'
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true)][string]$SubscriptionId,
  [Parameter(Mandatory=$true)][string]$ResourceGroup,
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-z0-9-]{2,60}$')][string]$AppName,
  [string]$Location = 'southafricanorth',
  [string]$PlanName = "$AppName-plan",
  [string]$AdminEmail = 'admin@example.com'
)

$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$package = Join-Path $appRoot 'pid-facilities-management-azure.zip'
if (-not (Get-Command az -ErrorAction SilentlyContinue)) { throw 'Azure CLI is required: https://learn.microsoft.com/cli/azure/install-azure-cli-windows' }
if (-not (Test-Path -LiteralPath $package)) { throw "Deployment ZIP not found: $package" }

$password = Read-Host "Password for $AdminEmail" -AsSecureString
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
try { $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr) }
if ([string]::IsNullOrWhiteSpace($plainPassword)) { throw 'An administrator password is required.' }

$randomBytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
$sessionSecret = [Convert]::ToBase64String($randomBytes)

az login | Out-Null
az account set --subscription $SubscriptionId
az group create --name $ResourceGroup --location $Location | Out-Null
az appservice plan create --name $PlanName --resource-group $ResourceGroup --location $Location --sku F1 | Out-Null
az webapp create --name $AppName --resource-group $ResourceGroup --plan $PlanName --runtime 'NODE|20-lts' | Out-Null
az webapp config set --name $AppName --resource-group $ResourceGroup --startup-file 'node server.js' | Out-Null
az webapp config appsettings set --name $AppName --resource-group $ResourceGroup --settings `
  "ADMIN_EMAIL=$AdminEmail" "ADMIN_PASSWORD=$plainPassword" "SESSION_SECRET=$sessionSecret" `
  'NODE_ENV=production' 'DATA_DIR=D:\home\pid-facilities-data' 'WEBSITE_RUN_FROM_PACKAGE=1' | Out-Null
az webapp update --name $AppName --resource-group $ResourceGroup --https-only true | Out-Null
az webapp deploy --name $AppName --resource-group $ResourceGroup --src-path $package --type zip | Out-Null

Write-Host "Deployment complete: https://$AppName.azurewebsites.net" -ForegroundColor Green
Write-Host 'Keep the same App Service plan at one instance; this version uses a shared file datastore.' -ForegroundColor Yellow
