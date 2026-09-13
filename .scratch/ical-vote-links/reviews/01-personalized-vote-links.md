# Review: 01-personalized-vote-links

Reviewed diff: `HEAD~5..HEAD` (b21f45b, 7b9af06, 4b32698, 7ab4578, eb96506) against the ticket + spec in `.scratch/ical-vote-links/`.

## Standards

No documented-standard violations found. Tooling (tsc, eslint, prettier) already enforced.

Judgement calls (no action, recorded only):

- `eventLines(session, date, now, options, vote)` is at 5 parameters — a Data Clump is brewing but a single-arg refactor now would be speculative.
- `voteUrl`/`pollUrl` share the join-path + `playerParam` composition; extracting a helper is six-of-one at this size.
- `IcalBuildOptions` cannot type-enforce "`token` and `labels` travel together"; the coupling is documented in comments and guarded at runtime by `vote` gating (no half-emitted files). A discriminated union is available if the seam grows caller demand.

## Spec

All 6 criteria implemented:

- [x] #1 three per-date choice links with correct `vote-<dateId>=Yes|IfNecessary|No` values, token + playerId percent-encoded, RFC 5545 folded.
- [x] #2 single `URL:` property = choice-less poll link (token only; playerId only when personalized).
- [x] #3 localized labels via new `vote_action_label` key (reuses `vote_yes`/`vote_if_necessary`/`vote_no`), synced en/de.
- [x] #4 join export accepts optional `playerId`; mismatched/absent → silent unpersonalized 200 (no error, no 4xx).
- [x] #5 poll and confirmed-info export links append `playerId`.
- [x] #6 edit export unchanged, byte-identical (no `token`/`team`/`labels` → no `URL:`/vote lines; guarded by new spec).

No scope creep: no changes to GET `/vote` casting (ticket 02), register/fallback (03), or e2e (04). Lines not asked for: none beyond the `playerId`-echo and gating, both required by the spec.

Gates: `npm run lint` green, `npm run test` 693 passed (39 files), coverage Statements 90 % / Branches 82 % / Functions 93 % / Lines 90 %.

Verdict: approve, no fixes required.