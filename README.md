# PID Facilities Management

A server-backed facilities-management system for asset operations, maintenance, safety, projects, centre administration, and staff workflows.

See [FEATURES.md](FEATURES.md) for the included modules and [AZURE-DEPLOYMENT.md](AZURE-DEPLOYMENT.md) for Azure hosting notes.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`. Set `ADMIN_EMAIL`, a unique `ADMIN_PASSWORD` with at least 12 characters, and a random `SESSION_SECRET` of at least 32 characters.
3. Run `npm install` and `npm start`.
4. Open `http://localhost:8080`.

The first startup creates the administrator account and initializes private app data under `data/`. Keep `.env` and `data/state.json` out of source control. In production, set secrets through the host's secret manager and persist `data/` on durable private storage.

## Roles

`superadmin`, `admin`, `hq`, `centre`, `technician`, `intern`, `viewer`, and `auditor`. Permissions and visible modules depend on the signed-in role.

## Azure deployment

The repository includes the Azure App Service deployment scripts and Bicep templates. Review `AZURE-DEPLOYMENT.md` and `AZURE-DEPLOYMENT-GUIDE.md`, then configure credentials in Azure App Settings or another secret manager before deployment.
