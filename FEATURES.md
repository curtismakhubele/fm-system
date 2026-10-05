# PID Facilities Management — feature map

This rebuild restores the facilities-management application from the supplied project archive. The runnable system is a Node.js server with a browser client in `index.html`. Persistent application records and user credentials are stored privately under `data/`; configure a strong session secret and first administrator credentials in `.env` before first startup.

## Included modules

- **Dashboard and HQ Platform:** operational overview, centre-level rollups, key counts, and location views.
- **Admin Platform and App Admin Settings:** user provisioning, role and centre assignment, temporary password/reset flow, account controls, permission matrix, system configuration, branding, and audit history.
- **Centres & GPS:** centre directory and mapped locations.
- **Assets:** register, edit, remove, search, filter, CSV import/export, condition tracking, and issue reporting.
- **Work Orders:** create, assign, prioritize, track, update, notify assignees, and export operational work.
- **Maintenance:** preventive maintenance schedules and overdue tracking.
- **Projects:** facilities project planning and status tracking.
- **Micro-Teaching Booking:** booking links for teaching sessions.
- **PID Media:** media capture and support for recording field activity.
- **Documents:** document records and Microsoft 365/SharePoint storage integration.
- **OHSA & Safety:** incidents, inspections, and safety follow-up.
- **Reports:** operational reports and CSV exports.
- **WhatsApp and Microsoft 365:** notification setup and Microsoft-connected email/file features.
- **Settings and My Platform:** account preferences and intern checklists/tasks.

Application access is role-based (Super Administrator, Admin, HQ, Centre Manager, Technician, Intern, Viewer, Auditor). Server-side sign-in uses HTTP-only signed sessions. Keep `.env` and `data/state.json` private; neither is part of this rebuild.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and set `SESSION_SECRET` to a random value of at least 32 characters, plus a unique `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters).
3. Run `npm install`, then `npm start`.
4. Open `http://localhost:8080`.

See `AZURE-DEPLOYMENT.md` for the Azure hosting setup.
