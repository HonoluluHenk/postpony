# Turso Production Deployment

## Prerequisites

- [Turso CLI](https://docs.turso.tech/reference/turso-cli) installed (`mise use turso@latest`)
- Logged in: `turso auth login`

## Steps

### 1. Create a Turso database

```bash
turso db create postpony
```

### 2. Get the database URL and auth token

```bash
turso db show postpony --url
turso db tokens create postpony
```

### 3. Set environment variables

```bash
export APP_DB_URL="libsql://<database-name>.turso.io"
export APP_DB_AUTH_TOKEN="<token>"
```

### 4. Run the migration

```bash
npm run db:migrate
```

### 5. Provide TLS certificates

The app serves HTTPS only and requires a certificate/key at
`developer-local-settings/conf/certs/<hostname>.pem` and `.key` (see
[TLS certificates](#tls-certificates)). Place your production cert/key there, or,
for local runs, generate self-signed ones with `scripts/create-certs.sh`.

### 6. Deploy the app

Build and start with the env vars set:

```bash
npm run build
APP_DB_URL="libsql://<database-name>.turso.io" APP_DB_AUTH_TOKEN="<token>" node dist/index.js
```

## Local development

The default `APP_DB_URL=file:./data/postpony.db` creates a local SQLite file — no Turso needed. The `data/` directory is created automatically on startup.

## TLS certificates

The server serves HTTPS only and reads its certificate and key from
`developer-local-settings/conf/certs/<hostname>.pem` and `.key`, where
`<hostname>` is `APP_HOSTNAME` (default `game-scheduler.localhost`). It exits at
startup if those files are missing. Provide your own cert/key pair at that path
for production, or, for local work, generate self-signed certs with
`scripts/create-certs.sh` (requires `mkcert` from mise).

## Schema

Run `npm run db:migrate` to apply the `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, club_id TEXT NOT NULL, data TEXT NOT NULL)` schema. This is idempotent — safe to run on every deploy. The decision behind this storage model is recorded in `docs/adr/0014-sqlite-session-store.md`.
