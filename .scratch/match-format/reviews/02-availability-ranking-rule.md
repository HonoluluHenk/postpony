# Review: 02-availability-ranking-rule

Reviewed diff: `fea3acb...HEAD` (commit `e9545f7`).

## Standards

All documented standards hold: strictly typed (`Team`, closed union `AvailabilityGroupKind`, `MatchFormat` read from the session), `explicit-function-return-type` on every helper, JSDoc on the new method matching the file's idiom, no locale/view/sort files touched, lint + full Vitest suite green (coverage ~99%).

Minor judgement calls (no fix needed — tooling already enforces the typing, and `docs/` is silent on these):

- `rankingSession` in the spec is annotated `ReturnType<typeof aSession>` instead of a plain `Postponement`. Slightly indirect; consistent with the spec file's builder-only style.
- `scoreOf` / `availabilityOf` / `byRank` are const arrows rather than `function` declarations ("function declarations preferred" in AGENTS.md). They must close over `tallies`/`session`, and the file already uses const arrows (`firstBy`); lint permits them.

Smell baseline: no duplication (the four buckets share one loop, the sort tail is one comparator), no feature envy (comparator reads tally + date data inside the owning domain module), no primitive obsession (group kind is a typed union, min/max come from the typed `MatchFormat`), no speculative generality (no abstraction beyond the required return type).

## Spec

Complete against `.scratch/match-format/spec.md` (Implementation Decisions + Testing Decisions) and the ticket's seven acceptance boxes:

- Groups returned in cascade order with the closed kinds and ranked dates; empty bands filtered. ✓
- Counts from the viewing team's own votes (`tally(session, team)`): yes vs yes+ifNecessary. ✓
- All four boundaries (below/at/above `minPlayers` and `maxPlayers`) covered at the domain seam. ✓
- Non-votable dates forced into `notPlayable`, never competing. ✓
- Ordering: full-strength yes desc → ifNecessary desc → start asc → id; other groups availability desc → start asc → id. ✓
- Both teams rank on their own votes; the opponent side's ranking never resurrects closed dates. ✓

Behavioural note (matches ADR-0027, not a defect): the operation's pool is the team's votable dates for the cascade, and non-votable dates are folded into `notPlayable` **only for the organizer team** (`team === session.organizerTeam`). This is the deliberate shape for the fixed `(session, team)` signature — the edit page renders closed dates (ADR consequence / story 21), the opponent page's votable-only surface never sees them (ADR consequence / story 25), and it is locked by the `hides non-votable dates entirely when ranking the non-organizer team` and `forces a non-votable date … into not-playable for the organizer team` tests. A reviewer reading "every non-votable date" universally should note the role distinction is intentional.

Summary: Standards 0 issues (2 minor judgement calls), Spec 0 issues. Nothing requires a fix.