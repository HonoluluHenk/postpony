# ADR 0018: Cloudflare Workers Deployment

## Status
Accepted

## Context
[ADR 0006](0006-cloud-hosting.md) prioritized a **Dockerized VPS via Coolify** (backed by Google Firestore) as the primary zero-cost deployment strategy, with Firebase Hosting & Functions as a serverless alternative. Both assumed a self-managed VPS or a Google-cloud data store.

Tickets 01–05 actually built a different deployment path for PostPony: a shared `buildApp(sessionStore)` assembly seam, optional TLS termination (the app no longer needs to own its certificate), Web Crypto PBKDF2 password hashing (no `nodejs_compat` shim for crypto), in-memory Eta template compilation (no `node:fs` at runtime), and a Cloudflare Worker entry (`worker.ts`) with `wrangler.toml`. The durable session store is Turso / `@libsql/client` SQLite, as decided in [ADR 0014](0014-sqlite-session-store.md).

This ADR records the deployment strategy that was actually implemented and makes it the approved, zero-cost target for PostPony.

## Decision
PostPony is deployed as a **Cloudflare Worker**, composed of the following building blocks:

1. **Compute**: Cloudflare Workers. The Worker imports the shared `buildApp(sessionStore)` seam and exports `{ fetch: app.fetch }`. Platform-terminated TLS (Cloudflare's edge) means the app serves plain HTTP internally; `APP_TLS_ENABLED=false` keeps the Node dev server aligned (ticket 02).
2. **Data store**: **Turso** (`@libsql/client/web`) backing the `SqliteSessionStore` from ADR-0014. The entire `RescheduleSession` is stored as a JSON blob; `worker.ts` constructs the store from Worker env bindings.
3. **Static assets**: **Workers Assets** serves `src/public` (CSS, vendor BeerCSS) directly at the edge, removing the need for a separate static host or CDN.
4. **Configuration & secrets**: `wrangler.toml` wires config `vars` and a Turso auth-token **secret** slot; no secret is published as part of this work.

This **supersedes the Dockerized-Coolify-VPS primary** recorded in ADR-0006 for the PostPony deployment. The Dockerized VPS option remains a valid, non-exclusive fallback but is no longer the chosen strategy.

## Rationale

- **True zero cost**: Cloudflare Workers free tier plus Turso's free tier cover PostPony's scale without always-on infrastructure.
- **No cold-start penalty for our workload**: Requests are short-lived Hono request-response cycles (HTMX OOB swaps), which fit the Workers execution model; the "always-responsive VPS" concern from ADR-0006 does not apply to this traffic shape.
- **Operational simplicity**: Workers Assets + a single Worker + Turso collapses what ADR-0006 split across VPS, Coolify, and Firestore into one managed platform.
- **Seam alignment**: The `buildApp` seam (ticket 01), Web Crypto hashing (ticket 03), in-memory templates (ticket 04), and the Worker entry (ticket 05) were all built to be platform-portable, so the same code runs on Node and on Workers.
- **GDPR / data residency**: Cloudflare terminates TLS and runs the Worker globally, but the only persisted user data is the `RescheduleSession` JSON blob, which lives in **Turso**. Turso lets the database be provisioned in an EU region (e.g. EU-west / Frankfurt), keeping personal player data (availability, votes) within the EU. This is a **region-agnostic, free-tier approach**: no Swiss/EU-only VPS is required, and residency is enforced at the data layer (Turso region) rather than at the compute layer.

## Consequences

- **Infrastructure management**: Operational burden shifts from self-hosting a VPS (Coolify, backups, security groups) to configuring a Worker + Turso, both managed by their providers.
- **Backups**: Responsibility for database backups moves to Turso (managed backups); the app no longer owns VPS-level backup tooling.
- **Secrets**: The Turso auth token is supplied via a `wrangler` secret, not the repo or `.env`.
- **Supersedes ADR-0006** for the PostPony deployment target.
