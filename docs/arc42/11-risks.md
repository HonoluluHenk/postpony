# 11. Risks and Technical Debt

## 11.1 Risks

### R1 — Organizer password is never verified (high)

`comparePassword` has exactly one call site, in the join path (`src/routes/join/join-utils.ts`). `handleEditGet` reads `?organizerPassword=` only to display it (`src/routes/edit/id/edit-id-get.tsx`). Anyone who knows or guesses a session id has full organizer access: propose, confirm, delete, reopen. This contradicts ADR-0002, the old spec, and README.

- **Evidence:** `comparePassword` import at `join-utils.ts:2`; no call in `src/routes/edit/`.
- **Ticket:** `.scratch/edit-authorization/01-organizer-password-verification.md`.
- **Mitigation:** session ids are UUIDs (unguessable), but the edit URL is shared freely as the "edit link", so this is not a real control.

### R2 — Single-tenant, but multi-tenancy scaffolding lingers

The system is single-club by design (`DEFAULT_CLUB_ID`). `club_id` is retained as a forward-compatible column, and ADR-0001 (multi-tenancy) is withdrawn. Risk: someone re-introduces tenant assumptions without a tenant model.

- **Evidence:** `src/lib/models.ts` `DEFAULT_CLUB_ID`; `session-store.ts` `get()` filters by `id` only.

### R3 — No CI, no machine-enforced coverage

`.github/workflows` does not exist; ADR-0010 is superseded. `npm run verify` is a manual gate. Risk: regressions and coverage erosion go unnoticed.

- **Ticket:** `.scratch/ci-pipeline/`.

### R4 — Scrape coupling to a third-party site

All creation depends on click-tt.ch HTML structure. The scraper already carries workarounds for live-DOM/fixture divergence. Risk: a click-tt markup change breaks creation silently (scrape failures degrade to clash-free dates, but creation has no fallback).

### R5 — Invitation password stored in plaintext

`invitationPassword` is persisted plaintext on the `Postponement` so the edit page can render share links. Risk: any read of the session JSON exposes a working join credential. Accepted trade-off; documented here for awareness.

## 11.2 Technical debt (documentation and code drift)

| Item                                  | Detail                                                                             | Ticket                         |
|---------------------------------------|------------------------------------------------------------------------------------|--------------------------------|
| Bare `/edit` is a reachable 404       | home page links `/edit`; no handler serves it                                      | `.scratch/edit-authorization/` |
| Dead `AvailabilityRecord` type        | declared, zero references (`models.ts:37-40`)                                      | `.scratch/dead-code/`          |
| Unenforced coverage thresholds        | no vitest `thresholds` block                                                       | `.scratch/ci-pipeline/`        |
| README drift                          | Eta, `npm run certs`, `npm run test:e2e`, stale dual-password/multi-tenancy claims | fixed this pass                |
| Stale ADR statuses                    | 0003/0009/0010/0011 were `Proposed` and described Firestore/Docker                 | fixed this pass                |
| Worker observability                  | console logger only (pino can't bundle)                                            | accepted                       |
| `.spec.` files under asset root       | blocked by a path filter instead of moved out                                      | accepted                       |
| libSQL node client kept out of bundle | lazy non-literal import (`session-store.ts`)                                       | accepted                       |

## 11.3 Known ceilings (ponytail markers)

Deliberate simplifications, each with a named upgrade path (see inline `// ponytail:` comments):

- Module-scope app/store on Workers → Durable Objects for per-request isolation (`worker.ts`).
- `newId`/`now` seam → real clock/id only in production.
- Fixture seam via dynamic `node:fs` → cleaner build-time asset split.
- O (n) scans (player table, candidate dedup) → bounded by small data; upgrade if counts grow.
