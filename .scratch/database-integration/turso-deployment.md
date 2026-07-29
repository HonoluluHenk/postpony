# Turso Production Deployment

## Prerequisites

- [Turso CLI](https://docs.turso.tech/reference/turso-cli) installed (`brew install tursodatabase/tap/turso` or `npm i -g @turso/cli`)
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

### 5. Deploy the app

Build and start with the env vars set:

```bash
npm run build
APP_DB_URL="libsql://<database-name>.turso.io" APP_DB_AUTH_TOKEN="<token>" node dist/index.js
```

## Local development

The default `APP_DB_URL=file:./data/postpony.db` creates a local SQLite file — no Turso needed. The `data/` directory is created automatically on startup.

## Migration

Run `npm run db:migrate` to apply the `CREATE TABLE IF NOT EXISTS sessions` schema. This is idempotent — safe to run on every deploy.
