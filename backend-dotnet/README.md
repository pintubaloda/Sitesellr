# Sitesellr .NET API (LTS)

ASP.NET Core `net8.0` Web API that mirrors the existing Python backend:

- `GET /api/` → health/hello
- `POST /api/status` → add status check `{ clientName }`
- `GET /api/status` → list status checks (most recent first)
- Auth endpoints (opaque tokens + session cookie): `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`.
- MFA: TOTP enroll/verify (`/api/auth/mfa/enroll`, `/api/auth/mfa/verify`) and MFA-aware login.
- WebAuthn (FIDO2) flows: `/api/auth/webauthn/register/options|verify`, `/api/auth/webauthn/login/options|verify`.

## Prereqs
- .NET SDK 8.0.403 installed under `~/.dotnet` (already installed here via `dotnet-install.sh`).
- PostgreSQL instance you can reach.

## Environment
- `POSTGRES_CONNECTION_STRING` (or `ConnectionStrings__Postgres`) — e.g. `Host=localhost;Port=5432;Username=postgres;Password=postgres;Database=sitesellr`
- `CORS_ORIGINS` — comma-separated origins; defaults to `*`.
- `APPLY_MIGRATIONS_ON_STARTUP` — set to `true` to auto-apply EF migrations at boot (default `false`).
- `Turnstile:SecretKey` — Cloudflare Turnstile secret (required for login/register).
- `WebAuthn:RpId`, `WebAuthn:Origin`, `WebAuthn:RpName` — relying party settings (dev defaults: `localhost`, `https://localhost:3000`, `Sitesellr Dev`).
- `Auth:MaxFailedAttempts`, `Auth:LockoutMinutes` — lockout tuning.

## Restore & run
```bash
cd backend-dotnet
DOTNET_CLI_HOME=$PWD/../.dotnet_cli ~/.dotnet/dotnet restore
DOTNET_CLI_HOME=$PWD/../.dotnet_cli ~/.dotnet/dotnet tool restore
POSTGRES_CONNECTION_STRING="Host=...;Port=...;Username=...;Password=...;Database=..." \
DOTNET_CLI_HOME=$PWD/../.dotnet_cli ~/.dotnet/dotnet run --project backend-dotnet.csproj
```

## Database migration
The initial migration is checked in (`Migrations/20260217120000_InitialCreate*`).
Apply it once against your database:
```bash
cd backend-dotnet
DOTNET_CLI_HOME=$PWD/../.dotnet_cli ~/.dotnet/dotnet tool restore
POSTGRES_CONNECTION_STRING="Host=...;Port=...;Username=...;Password=...;Database=..." \
DOTNET_CLI_HOME=$PWD/../.dotnet_cli ~/.dotnet/dotnet tool run dotnet-ef database update
```

## Notes
- Auto-migration is off by default to avoid blocking design-time tooling; enable via `APPLY_MIGRATIONS_ON_STARTUP=true` if desired.
- Security hardening in-place: opaque tokens stored hashed, rate limiting (configurable in `appsettings.json`), account lockout after repeated failures, HTTPS-only cookies, security headers middleware. Adjust Cloudflare Turnstile, CSP, and CORS values as you deploy.
