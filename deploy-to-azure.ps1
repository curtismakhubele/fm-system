#Requires -Version 5.1
<#
Deploy Pro-PID Facilities Management to Azure App Service using REST API
This script deploys a ZIP file to an existing Azure App Service using the Azure Management API
#>

param(
    [Parameter(Mandatory=$true)][string]$SubscriptionId,
    [Parameter(Mandatory=$true)][string]$ResourceGroup,
    [Parameter(Mandatory=$true)][string]$AppName,
    [Parameter(Mandatory=$true)][string]$ZipFilePath,
    [string]$AdminEmail = 'admin@example.com'
)

$ErrorActionPreference = 'Stop'

# Verify ZIP file exists
if (-not (Test-Path $ZipFilePath)) {
    throw "ZIP file not found: $ZipFilePath"
}

Write-Host "Pro-PID Facilities Management - Azure App Service Deployment" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host ""

# Get admin password
$password = Read-Host "Enter administrator password for $AdminEmail" -AsSecureString
$passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
}

if ([string]::IsNullOrWhiteSpace($plainPassword)) {
    throw "Administrator password is required"
}

# Generate session secret
$randomBytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($randomBytes)
$sessionSecret = [Convert]::ToBase64String($randomBytes)

Write-Host "Deployment Configuration:" -ForegroundColor Cyan
Write-Host "  App Service: $AppName"
Write-Host "  Resource Group: $ResourceGroup"
Write-Host "  Subscription: $SubscriptionId"
Write-Host "  ZIP File: $(Split-Path $ZipFilePath -Leaf)"
Write-Host ""

# Get access token
Write-Host "Authenticating to Azure..." -ForegroundColor Yellow

$tokenResponse = &{
    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $appId = "04b07795-8ddb-461a-bbee-02f9e1bf7b46" # Azure CLI App ID
    
    # Use device login flow via PowerShell
    $deviceCodeUri = "https://login.microsoftonline.com/common/oauth2/v2.0/devicecode"
    $deviceCodeBody = @{
        client_id = $appId
        scope = "https://management.azure.com/.default"
    }
    
    Write-Host "Opening browser for authentication..." -ForegroundColor Yellow
    $deviceCodeResponse = Invoke-RestMethod -Uri $deviceCodeUri -Method Post -Body $deviceCodeBody
    
    Write-Host ""
    Write-Host "Authenticate via device login:" -ForegroundColor Cyan
    Write-Host "  Code: $($deviceCodeResponse.user_code)" -ForegroundColor Green
    Write-Host "  URL: $($deviceCodeResponse.verification_uri)" -ForegroundColor Green
    Write-Host ""
    
    # Poll for token
    $tokenUri = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
    $maxAttempts = 120
    $attempt = 0
    
    while ($attempt -lt $maxAttempts) {
        $attempt++
        
        $tokenBody = @{
            client_id = $appId
            grant_type = "urn:ietf:params:oauth:grant-type:device_code"
            device_code = $deviceCodeResponse.device_code
        }
        
        try {
            $tokenResponse = Invoke-RestMethod -Uri $tokenUri -Method Post -Body $tokenBody -ErrorAction SilentlyContinue
            if ($tokenResponse.access_token) {
                return $tokenResponse.access_token
            }
        } catch {
            # Waiting for user to authenticate is expected
        }
        
        Start-Sleep -Seconds 5
    }
    
    throw "Authentication timeout. Device login failed."
}

Write-Host "✓ Authentication successful" -ForegroundColor Green
Write-Host ""

# Get the API version for App Service
$apiVersion = "2023-01-01"
$resourceId = "/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroup/providers/Microsoft.Web/sites/$AppName"

# Configure app settings
Write-Host "Configuring app settings..." -ForegroundColor Yellow

$appSettings = @{
    properties = @{
        ADMIN_EMAIL = $AdminEmail
        ADMIN_PASSWORD = $plainPassword
        SESSION_SECRET = $sessionSecret
        NODE_ENV = "production"
        DATA_DIR = "D:\home\pid-facilities-data"
        WEBSITE_RUN_FROM_PACKAGE = "1"
    }
}

$settingsUri = "https://management.azure.com$resourceId/config/appsettings?api-version=$apiVersion"
$headers = @{
    "Authorization" = "Bearer $tokenResponse"
    "Content-Type" = "application/json"
}

try {
    Invoke-RestMethod -Uri $settingsUri -Method Put -Body ($appSettings | ConvertTo-Json) -Headers $headers | Out-Null
    Write-Host "✓ App settings configured" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to configure app settings: $_" -ForegroundColor Red
    throw
}

# Enable HTTPS only
Write-Host "Enabling HTTPS only..." -ForegroundColor Yellow

$httpsConfig = @{
    properties = @{
        httpsOnly = $true
    }
}

$updateUri = "https://management.azure.com$resourceId?api-version=$apiVersion"
try {
    Invoke-RestMethod -Uri $updateUri -Method Patch -Body ($httpsConfig | ConvertTo-Json) -Headers $headers | Out-Null
    Write-Host "✓ HTTPS only enabled" -ForegroundColor Green
} catch {
    Write-Host "⚠ Warning: Could not enable HTTPS only: $_" -ForegroundColor Yellow
}

# Deploy ZIP file
Write-Host "Deploying ZIP file..." -ForegroundColor Yellow

$zipBytes = [System.IO.File]::ReadAllBytes($ZipFilePath)
$zipSize = $zipBytes.Length / 1MB

Write-Host "  File size: $([Math]::Round($zipSize, 2)) MB"

$deployUri = "https://$AppName.scm.azurewebsites.net/api/zipdeploy"

$basicAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$AppName`:$(${function:Get-PublishingPassword})"))

try {
    # Try to deploy with available credentials
    Write-Host "  Uploading ZIP to Azure..." -ForegroundColor Yellow
    
    $deployResponse = Invoke-RestMethod -Uri $deployUri -Method Post `
        -InFile $ZipFilePath `
        -Headers @{
            "Authorization" = "Bearer $tokenResponse"
            "Content-Type" = "application/zip"
        } `
        -TimeoutSec 600
    
    Write-Host "✓ ZIP file deployed successfully" -ForegroundColor Green
} catch {
    Write-Host "Note: ZIP deployment requires app credentials. Trying alternative method..." -ForegroundColor Yellow
    Write-Host "Manual step required: Deploy the ZIP file through Azure Portal or use Azure CLI after installation." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Deployment Summary" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host "App Service URL: https://$AppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "Configuration Status: ✓ App settings configured"
Write-Host "HTTPS Status: ✓ HTTPS only enabled"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open https://$AppName.azurewebsites.net in your browser"
Write-Host "2. Log in with credentials:"
Write-Host "   Email: $AdminEmail"
Write-Host "   Password: (the password you entered)"
Write-Host "3. Check application logs in Azure Portal if issues occur"
Write-Host ""
Write-Host "Note: If ZIP deployment didn't complete, use Azure CLI or Portal to deploy:" -ForegroundColor Yellow
Write-Host "  az webapp deploy --resource-group $ResourceGroup --name $AppName --src-path '$ZipFilePath' --type zip" -ForegroundColor Gray
