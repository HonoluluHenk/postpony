# 03 — Rename Reschedule → Postponement across the codebase

**What to do:** The canonical domain term for the primary entity is "Postponement" (`CONTEXT.md`). The code still speaks "Reschedule" everywhere: the state type, the status union, the rules module, the fixture builders, and the locale keys. Rename all of it to the canonical vocabulary. The `Reschedule` module class is not exempt — rename it too.

**Blocked by:** `01-remove-venue-concept.md` (rename touches `reschedule.ts` and `reschedule.spec.ts`, which also lose `setVenueLimit`) and `02-rename-meeting-to-match.md` (shared scrape-flow files). Do this rename last to avoid churn collisions.

**Status:** ready-for-agent

- [ ] `src/lib/models.ts`: `RescheduleSession` → `Postponement`, `RescheduleStatus` → `PostponementStatus`.
- [ ] `src/lib/reschedule.ts` → `src/lib/postponement.ts`: class `Reschedule` → `Postponement`, plus the header doc comment ("rules for one postponement" stays accurate). Keep operation names (`registerParticipant`, `addPlayer`, `proposeDate`, `castVote`, `tally`, `splitTallies`, `setAwayTeamVotable`) — those are verbs on the entity, not renames.
- [ ] `src/lib/reschedule.spec.ts` → `postponement.spec.ts`: `FakeReschedule` → `FakePostponement`, all `new Reschedule()` → `new Postponement()`.
- [ ] All handlers importing `Reschedule` from `lib/reschedule` (edit + join routes, `vote-view.ts`) → import `Postponement` from `lib/postponement`, instantiate `new Postponement()`.
- [ ] `src/lib/session-store.ts`, `src/routes/create/*`, `src/routes/join/join-utils.ts`, `src/lib/__test-utils__/builders.ts`: update the `RescheduleSession` type imports.
- [ ] Builders: `aSession()` return type and `name: 'Test Reschedule'` → `'Test Postponement'`; update `builders.spec.ts` (`name: 'Test Reschedule'`).
- [ ] Locale keys (`src/locales/en.json` + `de.json`): `create_reschedule_title` → `create_postponement_title`, `edit_reschedule_title` → `edit_postponement_title`, `reschedule_name` → `postponement_name`, `reschedule_created_success` → `postponement_created_success`. Update all call sites (`.eta` templates `create.eta`, `edit.eta`, and `create-get.ts`).
- [ ] `src/routes/create/create-post.spec.ts`: `name: 'Match Reschedule'` → `'Match Postponement'`.
- [ ] Re-run `npm run verify`; keep coverage ≥ 80%.