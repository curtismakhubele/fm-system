# PID Facilities Management — live application

This package replaces the browser-only demo with a server-backed application. It has password authentication, signed HTTP-only sessions, sign-in/sign-out, and one shared persistent datastore. No demo records or fallback browser storage are used.

## Live application

Open the deployed application at:

https://pid-ftf6dmerh7fmfkga.southafricanorth-01.azurewebsites.net

Sign in with the administrator account configured for the Azure App Service. The browser client connects directly to the live application server; no localhost server is required.

The initial account is created only on the first startup as the Super Administrator. Its password is stored as a salted scrypt hash in `data/state.json`; keep that directory private and back it up securely. Existing installations are not silently promoted.

## Manage team accounts

Create accounts in **Admin Platform**. The server generates a strong temporary password and shows it once; the user must change it at first sign-in. Existing passwords and password hashes are never viewable. If a user forgets a password, choose **Reset password** to issue a new temporary password and revoke their sessions.

Roles: `superadmin`, `admin`, `hq`, `centre`, `technician`, `intern`, `viewer`, and `auditor`. Only Super Administrators can assign that role or edit advanced system configuration.

For a forgotten password, run this on the application host with its existing `DATA_DIR` and environment configured. It prints a new temporary password once, revokes old sessions, and requires a change at the next sign-in:

```powershell
node server.js reset-password admin@company.co.za
```

To promote an existing account on the deployment host:

```powershell
node server.js promote-superadmin admin@company.co.za
```

The command revokes that account's active sessions; sign in again to apply the new role.

## Deploy safely

Deploy this folder to a Node.js host, set `NODE_ENV=production`, configure the environment variables in the host’s secret manager, terminate TLS/HTTPS at the host, and persist the `data` directory on durable private storage. Do not commit `.env` files or `data/state.json`.

For Azure App Service, use the included `pid-facilities-management-azure.zip` and follow [AZURE-DEPLOYMENT.md](AZURE-DEPLOYMENT.md). It sets `DATA_DIR=/home/pid-facilities-data` so application records are not written into the deployment package.

