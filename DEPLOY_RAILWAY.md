# Deploy Sitesellr on Railway

This repo is a monorepo. Deploy as separate Railway services:

1. `sitesellr-db` (PostgreSQL)
2. `sitesellr-api` (`backend-dotnet`)
3. `sitesellr-web` (`frontend`)

## 1) Create PostgreSQL

- In Railway: `New -> Database -> PostgreSQL`
- Copy connection URL and map it to backend env var `POSTGRES_CONNECTION_STRING`.

## 2) Deploy backend service (`backend-dotnet`)

- Service root: `backend-dotnet`
- Builder: Dockerfile (`backend-dotnet/Dockerfile`)

Required env vars:

- `POSTGRES_CONNECTION_STRING` = Railway postgres URL
- `Turnstile__SecretKey` = Cloudflare Turnstile secret
- `CORS_ORIGINS` = frontend URL (example: `https://sitesellr-web.up.railway.app`)
- `WebAuthn__RpId` = your auth RP domain
- `WebAuthn__Origin` = frontend HTTPS origin
- `ASPNETCORE_ENVIRONMENT` = `Production`
- `APPLY_MIGRATIONS_ON_STARTUP` = `true` (first boot only), then set `false`

Health checks:

- `GET /api/`
- `GET /swagger` (if enabled in current environment)

## 3) Deploy frontend service (`frontend`)

- Service root: `frontend`
- Builder: Dockerfile (`frontend/Dockerfile`)

Required env vars:

- `REACT_APP_API_BASE` = backend URL + `/api`
- `REACT_APP_TURNSTILE_SITE_KEY` = Cloudflare Turnstile site key
- `REACT_APP_STORE_ID` = optional default store GUID

## 4) First-run validation

1. Backend `/api/` returns 200.
2. Login/Register works with Turnstile.
3. Admin pages load Products/Customers/Orders from backend.
4. Settings > General > Save updates store values.

## 5) Production hardening checklist

- Restrict `CORS_ORIGINS` to actual frontend domain(s).
- Rotate Turnstile keys after initial setup.
- Disable automatic migration after first successful deploy.
- Set strict CSP and rate-limit values per environment.
