# Feature review: opponent-clash-visibility (tickets 01–04)

Scope: `git log --oneline main..HEAD` (53a1028, 1070f0a, a8188a3, 00b3182 + comment commits)
plus ticket 04 docs. Reviewed against AGENTS.md Standards and all four tickets' acceptance boxes.

## Standards — pass

- Typing/lint: `tsc` (src + e2e projects) and `eslint --max-warnings 0` green. New fns all carry
  explicit return types; arrows only as params; unused `_rules` prefixed. `function` declarations
  throughout (`OpponentDateChips`, `computeOwnSideCheck`, `mergeOwnSideClashes`,
  `handleOpponentRefreshPost`, `buildOpponentViewData`).
- Sections/headings: `#opponent-roster` / `#opponent-dates` keep `<h2>` first child; refresh-button
  row is a `<div>`, no nested sections.
- HTMX parity: `refreshError` warning and `StatusAnnouncement` exist in the initial render.
  The announcement move outside `#opponent-view` mirrors `edit.tsx:175` (outside `#edit-grid`),
  so veto/acceptable/refresh messages survive partial swaps — verified in diff.
- Locales: `clash_line` added to `en.json` + `de.json` in sync; fr-CH/it-CH reuse English per ADR-0016.
- Coverage: 99.4% stmts / 96.3% branches / 99.8% fns — above the 90% bar.
- Ponytail markers present on every deliberate simplification (occupancy degradation, tally cast,
  e2e toggle sequencing).
- E2E style: Page-Object helpers + role/text assertions; per-date CSS locators (`.date-cell`,
  `.date-chips`) match existing `EditPage` prior art (cells have no better accessible handle).

## Spec — all boxes hold

- 01: edit-side change is two import lines (byte-identical behavior); merge rule covered at the pure
  seam incl. first-merge and never-flip-votable. Note: "absent other side" = `[]`, forced by the
  `DateClashes` type (both arrays required) — schema-honest, and the edit page's
  `clean = clashes !== undefined && !hasClashes` treats it consistently. No change.
- 02: neutral `clash_line`, clean chip, unchecked silence, both-sides scoping (1 line opp / 2 edit),
  no organizer name/schedule, group roles, a11y checker, e2e — all in code and green.
- 03: password gate, pipeline re-render, byte-identical organizer side, votable untouched, warning /
  nothing-state degradation, home-only occupancy with failure preservation, no button without
  identity — each has a handler spec; e2e covers happy + error paths.
- 04: CONTEXT.md (Opponent Captain re-check right, per-side Clash note), ADR-0026, arc42 §§1/5/6
  (§§9/12 are pointers with no per-item lists — nothing to add), screenshots at both widths,
  full gate green (133 e2e).

## Targeted verifications for this review

- Claimed ticket-02 "race fix": absent from the code — confirmed via grep (no mutex/lock/queue in
  `src/`; only a test-side sequencing comment in `opponent-captain.e2e.ts:83-84`). Read-modify-write
  full-session saves remain last-write-wins, same as the pre-existing edit pipeline — accepted,
  out of scope.
- Ticket-03 StatusAnnouncement move: confirmed in `git diff main...HEAD -- opponent.tsx`
  (fragment wrapper, announcement first, `#opponent-view` nested inside).

## Findings requiring fixes

None for code or tests. One docs-honesty fix follows under `review-fixed`: bump the arc42
"last verified against commit" line to the ticket-04 completion SHA, since ticket 04's own
edits landed after the SHA the line currently names.
