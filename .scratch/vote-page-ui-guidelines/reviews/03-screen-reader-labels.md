# Review: 03-screen-reader-labels

Fixed point: `4cfd4a5` (docs: 01-viewport-harness-phone-small comments)
Diff: `git diff 4cfd4a5...HEAD`
Commits: `d295ebc ticket done: 03-screen-reader-labels`

## Standards

Reviewed against AGENTS.md, the `localization`, `testing`, `route-handlers` and
`semantic-html` skills, and the Fowler smell baseline.

- `vote_set_all_aria_label` is inserted in alphabetical position in **both**
  `en.json` and `de.json` with the same `<%= it.vote %>` placeholder, so
  `TranslationKeys` picks it up automatically (localization skill). No breach.
- The accessible name is built as `t('vote_set_all_aria_label', {vote: t('vote_yes')})`
  in `vote.tsx:74-100`; the visible text stays the short label. Semantic-html
  I.2 ("prefer visible text and native techniques") is satisfied: the label
  describes the action without repeating the role name ("button"). No breach.
- `VenueBadge` (`src/routes/partials/venue-badge.tsx:32-44`) drops `title` in
  favour of a clipped `visually-hidden` span — the project's established
  technique (`vote-tally.tsx`, `own-team-votes.tsx`) and the assistive-tech
  alternative the ticket asks for. No breach.
- `role="status"` on the save toast matches the shared `status-announcement.tsx`
  prior art for routine outcomes. No breach.
- Tests follow prior art: view assertions in `vote-view.spec.tsx`, interpolation
  in `translations.spec.ts`, behaviour asserted through `JoinPage` roles in
  `join-voting.e2e.ts`. `JoinPage.setAllVotes` now matches the full accessible
  name (`exact: true`), guarding the new contract rather than the old substring.
  No breach.

Judgement note (not a violation): `VenueBadge` calls `findVenue` twice — once
inside `venueTooltip` and once for the `hasName` guard (`venue-badge.tsx:37-42`).
The venue list is tiny and the second lookup buys the explicit "only expose a
name when one is known" guard, so inlining/rewriting `venueTooltip` would trade a
clear name for duplicated format logic. Not worth the churn (ponytail).

Judgement note (not a violation): `translations.spec.ts`'s `NEW_STRING_KEYS`
header comment still frames the list around the generator (issue 02); the vote
key is added to the same parity bucket. Doc drift only, no code effect.

Standards findings: 0 (2 judgement notes).

## Spec

Spec: `.scratch/vote-page-ui-guidelines/spec.md` (Implementation Decisions:
"Set-all accessible names", "Venue chip", "Saved toast", "No change") and ticket
`.scratch/vote-page-ui-guidelines/issues/03-screen-reader-labels.md`.

- "Each set-all button gets an `aria-label` built from a new translation key
  that interpolates the vote label, e.g. 'Set all: Yes'. Visible text stays
  'Yes' / 'if necessary' / 'No'." — Implemented in `vote.tsx`; asserted in
  `vote-view.spec.tsx` (aria-labels present) and e2e (found by role+name, and
  `toHaveText('Yes')`).
- "Vote label casing is not changed (decision: keep lower-case 'if necessary')."
  — `vote_if_necessary` values untouched; interpolation test pins
  "Set all: if necessary".
- "The shared Venue badge partial drops the `title` attribute. It renders the
  visible label as today, plus a visually-hidden span with the full Venue
  tooltip text … when the full name differs from the visible label." —
  Implemented; the multi-line view spec now asserts the hidden full name and the
  absence of `title="1 – Turnhalle orange…"`.
- "The 'votes saved' toast uses `role="status"` instead of `role="alert"`." —
  Implemented and asserted in the view spec.
- "No change to the vote POST handler, the Postponement domain module, the
  ADR-0013 player identity model, or the HTMX partial rendering." — Diff touches
  only the view, the shared badge, locales, and tests.
- "checkA11y passes on the vote page; edit-page chip baselines updated if
  needed." — The new e2e test runs `checkA11y()` on a vote page that now carries
  a venue-bearing legend; `join-voting.e2e.ts` is green. No PNG baseline was
  regenerated because the hidden text is visually hidden and the edit page's own
  chip (`proposed-dates-section.tsx:218`) was not touched.

Observation (not a defect against this ticket): the spec says "the edit page
uses the same partial and inherits the change", but the edit page renders its
own chip (`DateChips`, `proposed-dates-section.tsx:211-219`) and does not import
`VenueBadge`. The edit page is therefore left exactly as it was — which is the
safe outcome (user story 16: "its accessible name unchanged"), and touching it
would be the scope creep the spec's Out of Scope section forbids.

Missing requirements: none. Scope creep: none. Wrong-looking implementation:
none.

Spec findings: 0.

## Summary

- Standards: 0 findings. Worst issue: none.
- Spec: 0 findings. Worst issue: none.
