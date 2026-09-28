# PPMCS v2.3 — Mobile Field Operations (Multi-user Pilot)

This build advances PPMCS from the local JSON pilot to a multi-user PostgreSQL-backed field system.

## Includes
- iPhone/Android responsive PWA
- Secure login with JWT
- Admin and field-engineer roles
- PostgreSQL database
- 8 current projects pre-seeded
- Daily field reports
- Site photographs from camera/gallery
- Offline local queue with cloud synchronisation
- Audit log
- Photo file storage
- Admin export endpoint
- Docker Compose for app + PostgreSQL

## Quick test with Docker
1. Install Docker Desktop.
2. Copy `.env.production.example` to `.env` and change the secrets.
3. Run `docker compose up --build`.
4. Open `http://localhost:8080`.
5. Default pilot login comes from ADMIN_EMAIL / ADMIN_PASSWORD in compose; change it before deployment.

## Production deployment
Use HTTPS, a managed PostgreSQL database, object storage for photos, a long random JWT secret, backups, and a proper identity provider (Microsoft Entra ID recommended for a Microsoft 365 environment).
