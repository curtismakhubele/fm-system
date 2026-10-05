# Azure deployment

`pid-facilities-management-azure.zip` is ready for Azure App Service Windows F1 Free. It deliberately excludes `.env` and `data/`, so no local password or records are uploaded.

## Deploy

1. Install the Azure CLI and sign in to an Azure subscription.
2. In PowerShell, run:

```powershell
cd C:\Users\makhuc\Documents\Codex\2026-08-29\c\outputs\pid-facilities-management
.\azure-deploy.ps1 -SubscriptionId '<your-subscription-id>' -ResourceGroup 'rg-pid-fms' -AppName 'pid-fms-unique-name'
```

3. Enter the administrator password when prompted. The script creates a Windows F1 Free App Service plan, configures HTTPS, stores secrets as App Service settings, deploys the ZIP, and prints the live URL.

The server saves data under `D:\home\pid-facilities-data`, outside the read-only ZIP package. Keep the plan at one instance: the included JSON datastore is suitable for a small team, not multi-instance scaling. For a larger deployment, migrate storage to Azure Database for PostgreSQL or Cosmos DB before scaling out.

The package is intended for ZIP deployment through `az webapp deploy`; Azure App Service deploys ZIP contents to `/home/site/wwwroot`, while run-from-package mounts code read-only. [Microsoft’s ZIP deployment guidance](https://learn.microsoft.com/en-us/azure/app-service/deploy-zip?tabs=cli&view=vs-2022) and [run-from-package guidance](https://learn.microsoft.com/en-us/azure/app-service/deploy-run-package) cover this flow.

The first account configured for a fresh install is seeded as Super Administrator. To promote an existing account on the deployment host, run `node server.js promote-superadmin admin@company.co.za`; this revokes its sessions, so sign in again afterward.

## Microsoft Graph integration

The app uses App Service Authentication (Easy Auth) for Microsoft sign-in and reads the provider token from `/.auth/me`. Configure this after deployment:

1. In the App Service, open **Authentication** and add the Microsoft identity provider. Keep unauthenticated access allowed so the app can show its own sign-in screen.
2. Enable the token store and configure the provider client secret in App Service Authentication. Do not add the client secret to the repository, browser code, or `.env`.
3. In the Entra app registration, add Microsoft Graph delegated `Mail.Send` and `Files.ReadWrite` permissions. For a configured shared SharePoint site, add `Sites.ReadWrite.All` only when that site integration is needed. Grant tenant admin consent where required.
4. Configure the provider login parameters to request the scopes you enabled, then sign in again. For email and personal OneDrive, use:

	 ```json
	 "loginParameters": [
		 "scope=openid profile email offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/Files.ReadWrite"
	 ]
	 ```

	 Add `https://graph.microsoft.com/Sites.ReadWrite.All` only when enabling the shared-site option. The app refreshes provider tokens through `/.auth/refresh`.
5. In the app, open **Settings** and set the SharePoint folder. For a shared site, also enter its site ID. The folder is created on the first successful upload.

The Microsoft 365 panel reports whether the current account has the Graph scopes needed for mail and file actions. Mail falls back to a prefilled email, and document uploads fall back to in-app storage or a local download, when Graph access is unavailable.
