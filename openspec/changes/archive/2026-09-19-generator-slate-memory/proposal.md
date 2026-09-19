## Why

The Proposed Dates Generator empties its Monday–Sunday grid on every page load. An organizer who proposes a weekly slate ("we train Mon 18:00, Thu 20:00") must re-type the same days and times each visit, even though the slate is almost always the team's fixed availability.

## What Changes

- The generator form on the edit page gains a `data-generator-memory-key` attribute, derived from the organizer team's ClickTtTeamIdentity (`championship|group|teamtable`, ADR-0022). When that identity is absent, the attribute is omitted and the feature is silently off. The key is team-scoped, not side-scoped: the same team gets one slate whether it plays home or away.
- A client enhancement saves the generator's weekday times and venue into `localStorage` under that key on every generator submit (including failed validation), and prefills the grid on page load and after every HTMX swap that re-renders it.
- The stored slate is locale-canonical (weekday → `{hour, minute}` in 24h + `venueNumber`) and re-formatted into the request's locale token at fill time, so a slate captured in one locale renders correctly in another (`HH:mm` vs `hh:mm aa`). From/To continue to auto-default to the planning window and are NOT remembered.
- Prefill fills empty inputs only, so the server's authoritative `extras.times` echo always wins on error re-renders.
- No server-side model or handler changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `proposed-dates`: the Proposed Dates Generator requirement is extended with a "slate memory" capability — remembered per team, prefilled on the next invocation, locale-independent storage.

## Impact

- `src/routes/edit/id/proposed-dates-section.tsx` — GenerateForm emits `data-generator-memory-key`.
- `src/routes/edit/id/edit-id-get.tsx` / `render-edit-partials.tsx` — derive the organizer identity for the key on every render of the generator (initial + partial).
- `src/public/assets/js/ui.js` — new initializer: capture on submit, prefill on load and `htmx:afterSwap`, locale token formatter/parser mirroring the server grammar (`temporal-utils.ts:254-256`).
- `src/public/assets/js/main.js` — wire the initializer into the `load` handler.
- Tests: browser specs (`ui.spec.js`) for the token round-trip, empty-only guard, and venue resolution; e2e (`proposed-date-generator.e2e.ts`, `pages/EditPage.ts`) for reload/locale/votable-swap persistence.
- ADR note: reuses the ADR-0013 localStorage pattern under a distinct key namespace (`postpony-generator-`), but deliberately diverges from its per-postponement scoping — this memory follows the team identity, not the session. No explicit ADR is contradicted; a follow-up ADR/none amended. Out of scope: the separate hardening change (require `MatchSchema.teamtable`, typed `organizerTeamIdentity` helper) that would make the defensive skip unreachable.

## Non-goals

- No per-postponement scoping of the remembered slate (device-global per team is the point).
- No server-side persistence of the slate.
- No remembering of the From/To window (stays `defaultGeneratorDateRange`).
- No explicit "clear slate" control (leaving all rows empty and submitting forgets the slate).
- The identity-guarantee hardening (`MatchSchema.teamtable` minLength, `organizerTeamIdentity` helper) is a separate change; this change only guards-if-absent.