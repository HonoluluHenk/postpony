# Review: 04-vote-page-singular-heading

## Standards

No violations.

- `vote.tsx` uses the `t()` translation seam; the local `title` is still consumed by
  `pageLayout` (h1 + `<title>`), so no dead variable.
- Locale keys inserted alphabetically in `en.json` and `de.json`
  (`vote_availability_heading` between `vote_action_label` and `vote_calendar_hint`);
  `en.json` defines the `TranslationKeys` type, `de.json` carries the German text.
- Spec additions follow the existing `vote-view.spec.tsx` conventions (builders,
  `createApp`, `renderVoteStep`, `toContain` on the rendered body).

## Spec

Ticket criteria 1 and 2 are implemented and covered:

- Criterion 1 — the shared `<h1>` keeps "Vote on Proposed Dates"; the in-article
  `<h2>` now reads "Your availability" (en) / "Deine Verfügbarkeit" (de), a distinct
  informant matching spec.md "your availability" lead-in decision. No
  `<h2>Vote on Proposed Dates</h2>` anywhere.
- Criterion 2 — both new keys exist in `en.json` and `de.json` (fr-CH/it-CH reuse
  English per ADR-0016).

Criterion 3 (axe/semantic-structure e2e pass) is coordinator-delegated. Flag for the
coordinator: `e2e-tests/pages/JoinPage.ts` `voteHeading` (lines 33-35) and `join()`
(lines 108-111) still match the level-2 "Vote on Proposed Dates" heading and will
break once e2e runs; the POM should point at the new level-2 "Your availability"
heading (or the level-1 heading).

No fixes required.