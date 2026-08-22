# 06 — Turso production deployment docs

**What to build:** A deployer can follow step-by-step instructions to set up a Turso database and run the app in production. An `npm run db:migrate` script runs the schema migration standalone. The `CONTEXT.md` note about "in-memory today, Firestore per ADR-0007" is updated to reflect the Turso decision.

**Blocked by:** 05 — SQLite adapter + config + production wiring.

**Status:** done

- [x] `npm run db:migrate` script added (calls `migrate()` standalone)
- [x] Docs written at `.scratch/database-integration/turso-deployment.md` covering: install Turso CLI, `turso db create`, get URL + token, set env vars, deploy
- [x] `CONTEXT.md` updated: "in-memory today, Firestore per ADR-0007" → references Turso/SQLite
- [x] ADR-0007 updated to reflect actual decision (Turso instead of Firestore), or a new ADR superseding it