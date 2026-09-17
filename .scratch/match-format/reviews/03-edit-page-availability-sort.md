# Review: 03-edit-page-availability-sort

Reviewed diff: `609f2c1...HEAD` (commit `dfb3f4e`).

## Standards

All documented standards hold: the band mapping is closed and typed (`AvailabilityBand`, `Record<AvailabilityGroupKind, TranslationKeys>`) so a missing kind fails to compile; `explicit-function-return-type` on the two new helpers, both `function` declarations; the retired `available_group` key is gone and `en.json`/`de.json` stay in sync (fr-CH/it-CH reuse English automatically); locale keys carry the count via the existing `<%= it.count %>` interpolation. Lint, full Vitest suite (coverage ~99%) and all 139 Playwright tests are green.

Judgement calls (no fix needed):

- **Duplicated Code (minor)** — `rules.availabilityRanking(session, team).map((group) => ({kind: group.kind, ids: group.dates.map((date) => date.id)}))` appears verbatim in `buildEditPartialsData` and `buildOpponentViewData`. Two 2-line call sites; a shared `toAvailabilityBands(groups)` helper would centralise the domain→band shape, but the current form is small and both sites are already the natural owners of "which team do I rank". Leaving as-is unless a third caller appears.
- `availabilityGroupBands` renders exactly the bands it is given; the domain already filters empty groups, so no zero-count header reaches the UI (pinned by the component tests, not by a helper-side filter). Deliberate — the domain owns emptiness.

Smell baseline: no feature envy (the builders call the domain, the view maps bands to rows), no primitive obsession (kind is a union, not a magic string), no repeated switch (one `Record` map replaces a per-kind cascade), no speculative generality (one interface, two pure functions), no message chains (the domain→band walk sits at the builder boundary).

## Spec

Complete against `.scratch/match-format/issues/03-edit-page-availability-sort.md`:

- Four groups from the domain ranking scoped to the organizer team — `buildEditPartialsData` ranks `session.organizerTeam`; the away-organizer component test ranks the away tallies. ✓
- Fixed labels with date counts, empty groups absent — `availabilityGroupLabel` maps each kind to its key; component tests assert all four headers, the last-band ordering, and that Full strength / With if-necessary are absent when the domain omits them. ✓
- en/de in sync, retired key removed — ✓; fr-CH/it-CH reuse English per ADR-0016. ✓
- Non-votable dates stay visible under Not playable — dedicated component test with a closed date carrying a full-strength tally still rendered under Not playable; the domain already forces non-votable organizer-team dates there (ticket 02). ✓
- Date sort and `?sort=` transport unchanged — sort control untouched; the edit handler tests still assert `HX-Current-URL` recovery, and the e2e asserts the URL/reload round-trip. ✓
- One availability sort — the count-based `groupByAvailability` is deleted; both captain pages share `groupByAvailabilityBands`. ✓
- Component coverage — four headers + translations, empty bands absent, closed date under Not playable. ✓
- E2E via the edit POM — the rewritten test drives three home voters across four dates to reach all four bands, asserts the strongest-first ordering, mutates (add date → Not playable grows), then switches back to weekly grouping; `checkA11y()` passes at the availability state. ✓

Scope note (intentional, not creep): the ticket's "one availability sort" clause forced migrating the opponent page off the deleted helper in the same change, so `opponent.tsx` / `render-opponent.tsx` and their specs move to `groupByAvailabilityBands` too. This overlaps ticket 04's surface; ticket 04 should be read as verifying/refining the opponent behaviour rather than building it from scratch.

Summary: Standards 0 issues (1 minor judgement call), Spec 0 issues. Nothing requires a fix.
