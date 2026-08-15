# 01 — Two-phase domain core: model, migration, status lifecycle

**What to build:** the new domain foundation for two-phase team voting. `PostponementStatus` shrinks to `Draft | Voting | Confirmed` (dropping `Proposed` and `Confirmed by Opponent`). `ProposedDate.awayTeamVotable` is renamed `votableByOpponent`. `Postponement` gains `organizerTeam` ('home' | 'away'), `reopenCount` (starts 0), and `confirmedProposedDateId` (kept as history on reopen). Old sessions stored on disk keep their legacy shape and are upgraded on read by a pure `normalize` function applied to every session returned by the store (both SQLite and memory): flag rename with value kept, `organizerTeam` absent → 'home', `reopenCount` absent → 0, `confirmedProposedDateId` absent → left undefined, legacy statuses remapped to `Voting`. The lifecycle: `Draft` at creation, `Voting` on first proposed-date add and on reopen, `Confirmed` on lock. Domain operations gain `confirmDate` (sets `confirmedProposedDateId` and status → `Confirmed`; rejects any date that is not `votableByOpponent`),
`reopen` (status → `Voting`, `reopenCount` + 1, keeps the confirmed date as history and all votes and date flags), and the renamed `setVotableByOpponent`; `proposeDate` flips `Draft → Voting` on the first add while later adds keep `Voting`. Own-team completion helpers compute, per date, an "N/M voted" count and a non-voter list ("voted" = has a Vote on that date of any type; denominator M = all organizer-team players, roster plus any new names, joined or not; never-joined players are marked "not joined"). Fixture builders and all unit tests move to the new shape in lockstep so the codebase stays green in one commit; the migration path is exercised by the `normalize` unit test.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Status union is `Draft | Voting | Confirmed`; all code and builders reference only these, with no leftover references to `Proposed` or `Confirmed by Opponent`.
- [ ] `ProposedDate` field renamed `votableByOpponent` everywhere (domain module, handlers, templates, builders, tests).
- [ ] `Postponement` carries `organizerTeam`, `reopenCount`, `confirmedProposedDateId`; creation paths (manual + scrape) write them.
- [ ] `normalize` upgrades a legacy session on read in both stores: flag rename, defaults, status remap; unit test covers the legacy row.
- [ ] `proposeDate` transitions `Draft → Voting` on first add and stays `Voting` on later adds.
- [ ] `confirmDate` sets `confirmedProposedDateId` + `Confirmed`, rejects non-`votableByOpponent` dates, and is idempotent.
- [ ] `reopen` returns to `Voting`, increments `reopenCount`, and preserves confirmed-date history, all votes, and all per-date flags.
- [ ] Completion helpers return per-date voted count, correct denominator, and non-voter list with never-joined marking.
- [ ] Builders updated in lockstep; builder-drift spec asserts every new required field.
- [ ] All unit tests for the domain module pass with the new shape.
