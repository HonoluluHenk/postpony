# Review: 05-vote-tables-in-disclosures

**Fixed point:** `HEAD~1` (parent of `ticket done: 05-vote-tables-in-disclosures`, `5ad1a19`)
**Commits:** `5ad1a19`

## Standards

Reviewed against `AGENTS.md`, the `semantic-html`, `route-handlers`/`htmx`, and `testing` skills, plus the Fowler smell baseline.

- **Semantic HTML — pass.** Each vote table sits in a native `<details>` whose `<summary>` is its first child and holds the existing heading as its single heading child (a valid `summary` content model). The section retains `aria-labelledby` pointing at that heading, so each region keeps its accessible name (`region "Home Team Votes"` confirmed in the a11y tree). The disclosure is emitted without an `open` attribute on both the initial render and every HTMX partial (OOB) re-render, so a swap always re-parses it closed — satisfying "closed on initial render and on HTMX partial re-render".
- **`<section>` heading-first-child — judgement call, not a hard breach.** The vote `<section>`s now have `<details>` as their first child, because the spec mandates "the existing heading moves into the disclosure summary", and a `summary` must be the first child of `details`. The section is still named by that heading via `aria-labelledby`, so the intent of the rule ("every section is labelled by a heading") holds. A restructure that drops the `<section>` in favour of the `<details>` as the card would satisfy the letter of the rule but would change the region role to `group` and force class/`aria` props onto the shared `VoteTally`. Left as-is; flagged for the reviewer's judgement.
- **Duplicated Code (minor smell).** `openHomeTally` / `openAwayTally` / `openOwnTeamVotes` share the same `.locator('summary').click()` body. Kept as three explicit, intent-named helpers (a private `openDisclosure(section)` would turn them into middle-men); acceptable for three short test helpers.
- **Typing / no-any / explicit return types — pass.** The `disclosure?: boolean` prop is strongly typed; every new helper declares its return type.
- **HTMX partial vs initial — pass.** Both the initial template (`edit.tsx`) and the partial set (`proposed-dates-section.tsx`, `team-section.tsx`) render the three disclosures; unit specs pin the closed default in both, and e2e verifies the live swap re-closes them.

## Spec

Spec source: `.scratch/edit-page-responsive-redesign/spec.md` (Phase 2 — structural cleanup) and ticket 05.

1. **Each of the three vote tables in a `details`, closed on initial + partial render — pass.** `own-team-votes.tsx`, `vote-tally-section.tsx` (home/away) all wrap in `details`; no `open` attribute anywhere.
2. **`summary` contains the existing heading (hierarchy unchanged) — pass.** The `h3` heading ids (`own-team-votes-title`, `vote-summary-home-title`, `vote-summary-away-title`) move verbatim into the summaries; levels unchanged.
3. **Unit render spec asserts details/summary wrapping + closed default — pass.** New cases in `own-team-votes.spec.tsx`, `vote-tally.spec.tsx`, `edit-page.spec.tsx`, plus OOB assertions in `proposed-dates-section.spec.tsx` and `team-section.spec.tsx`.
4. **e2e tally assertions open the disclosure first; keyboard Enter/Space opens it — pass.** `EditPage` gained `openHomeTally`/`openAwayTally`/`openOwnTeamVotes`; all tally reads in `postponement-editing.e2e.ts`, `join-voting.e2e.ts`, `responsive.e2e.ts` open first; a new keyboard test drives Enter and Space on the focused summary.
5. **`checkA11y` at all three widths — pass.** Full `npm run verify` (includes the phone/tablet/desktop a11y suites) is green.
6. **Screenshot baselines regenerated — pass.** Only `edit-with-dates`, `edit-with-votes`, `edit-confirmed` were regenerated (the three that render vote tables now collapsed); `edit-empty` is byte-identical and untouched.
7. **`npm run verify` passes — pass.**

**Scope creep check:** none. No strings touched (no `localization` change), no join-page behaviour change (`VoteTally` without `disclosure` keeps the always-open variant), no new dependencies.

## Summary

Standards: 2 judgement calls (section heading-first-child; duplicated open helpers), no hard violations.
Spec: 7/7 criteria met, no missing or extra behaviour.
Worst within each axis: Standards — the section heading-first-child nuance (deliberate, spec-driven). Spec — none.
