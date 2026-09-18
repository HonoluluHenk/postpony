# Organizer password is never verified

Status: resolved

## Summary

The organizer password is generated, hashed, and stored, but never verified. Anyone who knows a postponement's session id has full organizer access (propose, confirm, delete, reopen, edit roster).

## Evidence

- `comparePassword` has exactly one call site: `src/routes/join/join-utils.ts:70` (the invitation token).
- `handleEditGet` (`src/routes/edit/id/edit-id-get.tsx:14`) reads `?organizerPassword=` from the query **only to display it**; it never calls `comparePassword`.
- All seven edit POSTs run through `runEditCommand` (`src/routes/edit/id/run-edit-command.ts`), which does `store.get(id)` and no password check.
- The password is hashed at creation (`src/routes/create/scrape/match-post.ts`), and the plaintext is shown once and echoed in redirects.

## Consequences

Contradicts ADR-0002 and the "organizer password = edit access" model. Session ids are UUIDs (unguessable), but the edit link is shared freely, so URL-knowledge is the de facto access control.

## Resolution

Resolved by commit `308acad` ("feat (edit): require organizer-captain password for edit access"): `requireOrganizerCaptain` in `src/routes/edit/id/edit-auth.ts` now verifies the password via `comparePassword` on `handleEditGet` and on every edit POST through `runEditCommand`. The reconnect/landing workflow this issue's open question anticipated was later removed entirely (see issue 02), so password transport stays as `?organizerPassword=`.
