# 11. Risks and Technical Debt

## 11.1 Risks

### R1 — Resolved: organizer password now verified

The organizer-captain password is verified on every edit GET and POST (`src/routes/edit/id/edit-auth.ts`), closing the former gap where the session URL alone granted edit access. The old `.scratch/edit-authorization/` ticket is superseded by the two-captain work (ADR-0025). Kept here as history: the risk was that `handleEditGet` only displayed `?organizerPassword=` and never verified it.

### R2 — Single-tenant, but multi-tenancy scaffolding lingers

The system is single-club by design (`DEFAULT_CLUB_ID`). `club_id` is retained as a forward-compatible column, and ADR-0001 (multi-tenancy) is withdrawn. Risk: someone re-introduces tenant assumptions without a tenant model.

- **Evidence:** `src/lib/models.ts` `DEFAULT_CLUB_ID`; `session-store.ts` `get()` filters by `id` only.

### R3 — No CI, no machine-enforced coverage

`.github/workflows` does not exist; ADR-0010 is superseded. `npm run verify` is a manual gate. Risk: regressions and coverage erosion go unnoticed.

- **Ticket:** `.scratch/ci-pipeline/`.

### R4 — Scrape coupling to a third-party site

All creation depends on click-tt.ch HTML structure. The scraper already carries workarounds for live-DOM/fixture divergence. Risk: a click-tt markup change breaks creation silently (scrape failures degrade to clash-free dates, but creation has no fallback).

### R5 — Three shareable secrets stored in plaintext

The three shareable secrets — opponent-captain, home-player, away-player — are persisted plaintext on the `Postponement` so the share links can render (the organizer team's link on the edit page, the opponent team's link on the opponent-captain page). Risk: any read of the session JSON exposes working credentials. Accepted trade-off; documented here for awareness. The organizer-captain plaintext is never persisted.

## 11.2 Technical debt (documentation and code drift)

| Item                                  | Detail                                                                             | Ticket                         |
|---------------------------------------|------------------------------------------------------------------------------------|--------------------------------|
| Unenforced coverage thresholds        | no vitest `thresholds` block                                                       | `.scratch/ci-pipeline/`        |
| README drift                          | Eta, `npm run certs`, `npm run test:e2e`, stale multi-tenancy claims             | fixed this pass                |
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
