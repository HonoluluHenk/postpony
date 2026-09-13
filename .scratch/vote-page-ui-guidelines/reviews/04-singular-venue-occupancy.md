# Code review — 04-singular-venue-occupancy

Fixed point: `0120e62` (`...HEAD`). Only commit reviewed: `a2045a0`.

## Standards

Reviewed against `AGENTS.md`, the `localization`, `testing`, and `route-handlers` skills, and the Fowler smell baseline. No hard violations found.

- **No violation — key ordering.** `venue_legend_occupancy_one` sits directly after `venue_legend_occupancy` in both files; alphabetical (`short` before `short_one`), matching the `venue_occupancy_line` / `venue_occupancy_line_one` precedent. (localization skill: "Keys are alphabetically ordered".)
- **No violation — parameters in parity.** Plural `venue_legend_occupancy` keeps `<%= it.count %>` in both locales; singular `_one` has no placeholder in either. Matches `venue_occupancy_line_one`. (localization skill: "same placeholder name in both".)
- **Judgement call — Duplicated Code (minor).** The singular/plural selection shape `count === 1 ? t(..._one) : t(..., {count})` now appears a third time (`venue-occupancy-info.tsx:46`, `proposed-dates-section.tsx:247`, `vote.tsx:111`). An extractable helper would remove the repetition, but the two sites use different key pairs and `AGENTS.md` ponytail rules say "No abstractions that weren't explicitly requested"; the inline form follows established repo precedent. Suppressed.
- **Judgement call — Complex Conditional (minor).** The nested ternary in `vote.tsx` is terse; repo precedent uses the same shape. Acceptable.
- **Test churn (not a violation).** `clash-checks.e2e.ts:145` flipped `'1 other games'` → `'1 other game'`. This corrects a stale assertion that encoded the bug; not a weakened assertion (testing skill: "Never weaken assertions").
- **Test duplication (minor).** The new `vote-view.spec.tsx` case restates the venue fixture; every sibling test in that block does the same, so it is consistent prior art.

## Spec

Reviewed against `spec.md` (line 48) and the ticket acceptance criteria. No findings.

- (a) Missing/partial: none. `venue_legend_occupancy_one` exists in `en.json` and `de.json`; `vote.tsx` picks the singular key at exactly count 1 and the plural key otherwise. Matches spec line 48 verbatim.
- (b) Scope creep: none. Only the locale files, `vote.tsx`, the two specs, the stale e2e assertion, and the ticket file changed. No ticket 01/03 file, no `postponement-editing.e2e.ts`, no `viewports.ts`, no screenshot baselines in the diff.
- (c) Wrong-looking implementation: none. The e2e singular assertion the spec's seam 1 calls for ("singular '1 other game' rendered for a seeded Proposed Date with Venue Occupancy 1") is now covered by the corrected `clash-checks.e2e.ts` assertion; view spec covers count 1 vs 2; translations spec covers both locales.

## Summary

- Standards: 0 hard violations, 3 judgement-call smells (2 suppressed by documented ponytail/precedent; 1 minor test duplication).
- Spec: 0 findings.
- Worst issue per axis: Standards — the minor smell-shaped duplication of the singular/plural ternary; Spec — none.
- Verdict: no fixes required.
