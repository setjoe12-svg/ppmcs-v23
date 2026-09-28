# PPMCS v2.5 — Rhema Project BCEGI

## Scope
v2.5 implements the first functional data layer for the Executive Portfolio Dashboard and Project Control Centre.

- PostgreSQL schema for users, projects, WBS/activities, daily reports, risks and audit log.
- JWT authentication and role-ready API.
- Portfolio API and project-detail API.
- Daily report API ready for offline queue synchronization.
- Render deployment configuration for a PostgreSQL database + Node web service.
- Frontend remains usable in pilot/offline mode when the API is not connected.

## Render deployment
1. Create a Render PostgreSQL database named `ppmcs-db` (free/Oregon is acceptable for the pilot).
2. Create a Node Web Service from this folder, or use `render.yaml`.
3. Set `DATABASE_URL` to the database connection string and generate `JWT_SECRET`.
4. Set `PPMCS_SEED_PASSWORD` to a temporary administrator password before first deployment.
5. Deploy and open `/api/health`. It should return `database: connected`.
6. Login with username `adewale.joseph` and the seed password.

## Security
Change the seed password immediately after first login and replace the pilot authentication with the organisation's production identity provider before production use.


## PPMCS v2.6 — Steps 4–7
- QA/QC inspections and NCR register
- HSE event register
- Risk, issues and management actions
- Cost and commercial ledger
- Executive/portfolio reporting and CSV export
- Administration, roles and audit trail
- Authenticated technical-control APIs
- PostgreSQL schema migrations
