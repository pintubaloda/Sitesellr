# Deploy Sitesellr on Render

This repo includes a Render Blueprint at `render.yaml` for:

1. `sitesellr-db` (PostgreSQL)
2. `sitesellr-api` (.NET backend via Docker)
3. `sitesellr-web` (React static site)

## One-click setup (Blueprint)

1. Push latest code to GitHub.
2. In Render: `New +` -> `Blueprint`.
3. Select this repo and deploy.

Render creates all services from `render.yaml`.

## Required secrets after creation

Set these in Render dashboard:

- Backend (`sitesellr-api`)
  - `Turnstile__SecretKey`
- Frontend (`sitesellr-web`)
  - `REACT_APP_TURNSTILE_SITE_KEY`
  - `REACT_APP_STORE_ID` (optional)

## First deploy notes

- `APPLY_MIGRATIONS_ON_STARTUP=true` is enabled for bootstrap.
- After first successful deployment and DB migration, set:
  - `APPLY_MIGRATIONS_ON_STARTUP=false`

## Update frontend/backend URLs (important)

If Render gives different final URLs, update:

- Backend `CORS_ORIGINS`
- Backend `WebAuthn__RpId`
- Backend `WebAuthn__Origin`
- Frontend `REACT_APP_API_BASE`

to the exact deployed domains.

## Quick verification

1. Backend health: `GET https://<api-domain>/api/`
2. Frontend opens: `https://<web-domain>/`
3. Login/Register works with Turnstile.
4. Admin pages load products/customers/orders.
