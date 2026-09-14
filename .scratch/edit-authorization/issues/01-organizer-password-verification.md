# Organizer password is never verified

Status: needs-triage

## Summary

The organizer password is generated, hashed, and stored, but never verified. Anyone who knows a postponement's session id has full organizer access (propose, confirm, delete, reopen, edit roster).

## Evidence

- `comparePassword` has exactly one call site: `src/routes/join/join-utils.ts:70` (the invitation token).
- `handleEditGet` (`src/routes/edit/id/edit-id-get.tsx:14`) reads `?organizerPassword=` from the query **only to display it**; it never calls `comparePassword`.
- All seven edit POSTs run through `runEditCommand` (`src/routes/edit/id/run-edit-command.ts`), which does `store.get(id)` and no password check.
- The password is hashed at creation (`src/routes/create/scrape/match-post.ts`), and the plaintext is shown once and echoed in redirects.

## Consequences

Contradicts ADR-0002 and the "organizer password = edit access" model. Session ids are UUIDs (unguessable), but the edit link is shared freely, so URL-knowledge is the de facto access control.

## Open question (product decision)

Is edit access meant to be password-gated, or is the session-id URL the intended capability? If gated, decide where the password lives across requests (query param vs cookie vs session store) and how HTMX partials and bookmarked links behave.

## Suggested approach (once the product decision is made)

1. Add a guard to `runEditCommand` and `handleEditGet` that verifies `organizerPassword` against `organizerPasswordHash` (`comparePassword`).
2. Decide the transport (cookie likely, to avoid the password leaking into logs/referers).
3. Keep the iCal edit endpoint's public-read behaviour explicit (see `src/routes/edit/id/ical-get.ts:4-8`).
4. Update e2e to cover the unauthenticated (403) and authenticated paths.
