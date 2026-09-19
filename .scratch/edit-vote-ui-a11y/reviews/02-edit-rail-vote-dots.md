# Review: 02-edit-rail-vote-dots

Reviewed: the uncommitted working-tree diff (to be split into the `ticket done`
and `review` commits) against the ticket's acceptance criteria, the spec's
Implementation/Testing decisions, and the repo's documented patterns/smells.

## Standards

No hard violations. The change stays entirely in the edit-rail layer (`src/routes/edit/id/`),
reuses the existing `VOTE_KEYS` TranslationKeys mapping via a one-line export
(`own-team-votes.tsx`), and adds no locale keys (reuses `vote_yes` /
`vote_no` / `vote_if_necessary` / `no_vote`). ESLint (type-aware,
`--max-warnings 0`), both tsc gates, and the full `npm run test` (unit + browser)
pass on this worktree; coverage is 99%+, and the touched files clear 90%.

Two judgement-call nits (both kept, both cheap; flagged so posterity can decide):

- **`if necessary` casing is ticket 06's lever.** The en render assertions here
  hard-code the current lowercase `vote_if_necessary` value
  (`aria-label="Alice: if necessary"`). Ticket 06 (label casing) owns changing
  that key to title case; when it lands, it must also flip the two dotted-label
  assertions in `proposed-dates-section.spec.tsx`. Not a defect now.
- **List semantics live on empty spans.** The dots are `<span role="listitem"
  aria-label="…">` with no text content. That is the standard author-named list
  item pattern the e2e `checkA11y` gates in the coordinator run will ultimately
  certify; if any assistive tech proves flaky, the established fallback in this
  repo is a `visually-hidden` text node inside the dot (pattern already used by
  `own-team-votes.tsx` and the vote page).

## Spec

All acceptance criteria met:

- The vote-dot group announces each player's vote — the group renders
  `role="list"`, each dot `role="listitem"` with `aria-label` of the form
  `<player>: <vote value>` using the locale keys (Yes / No / no vote / if
  necessary) — and the `title`-only hint is gone (`voteTitle` deleted, no
  `title=` in the rendered dots). AC-1 ✔
- The dots stay `0.85rem` colour circles with their classes unchanged, the
  `voted_count` "N/M voted" text is untouched, and the labels are announced
  without sight or hover. AC-2 ✔
- `proposed-dates-section.spec.tsx` asserts the group's `role="list"`, each
  dot's `role="listitem"` + `aria-label` mapping players to their votes and the
  abstention, and that no `title="Alice: Yes"` remains; `edit-page.spec.tsx`
  asserts the same labels on the full-page render. AC-3 ✔

Out of scope correctly untouched: no `.visually-hidden`/CSS changes, no locale
file edits (`vote_if_necessary` / `vote_yes` / `vote_no` / `no_vote` reused as
is), no `join/` or shared-layout changes. The spec's note that the vote page's
"availability-carrying tooltips already used elsewhere" is honoured by using the
existing `VOTE_KEYS` key set rather than inventing a new label string.

No review-fix commit needed.