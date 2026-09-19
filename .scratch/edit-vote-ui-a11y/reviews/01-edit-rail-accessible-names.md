# Review: 01-edit-rail-accessible-names

Reviewed: diff `2aaf9be^…2aaf9be` against the ticket's acceptance criteria and the
repo's documented patterns/smells. Fixed point for the merge-base review:
`fdebf01^…2aaf9be`.

## Standards

No hard violations. The change sits entirely in the established partial/rail
layer, reuses the existing `TranslateFn`/`TranslationKeys` and `row.display`
seam, and every locale key landed in both en + de (alphabetised, proven by the
auto-derived `TranslationKeys` type resolving the new keys and the existing
locale sync spec). ESLint (type-aware, `--max-warnings 0`), the two tsc gates,
and `npm run test` all pass on this worktree; coverage on the new files is 100%.

Two judgement-call nits (both kept, both cheap; flagged so posterity can decide):

- **Joined output label leaks into two shapes.** `weekLabelWithRange` joins
  "label · range" itself, and the week-group band label hand-writes the same
  "· range" join — the shared `controlNameWithDate` composing step (the ticket's
  headline) is not reused for the *group* headings Blood. That's deliberate:
  group headings are `<h3>` with a separate visually-hidden tooltip, not
  per-row controls, so routing them through the control composer would be
  worse-named. If a later ticket composes group headings too, extract one
  `labelWithRange` alongside `controlNameWithDate`.
- **`range` double-means.** The rail's `range` output string is reused as both a
  week-range label and an availability band's own week sub-label. It's the
  established partial contract here, so changing it now would ripple through the
  rail and its specs without a user-visible gain. Revisit only if a band
  actually needs its own range wording.

## Spec

All acceptance criteria met:

- Each Delete, Votable-toggle, and Confirm Date control carries "control · date"
  via the shared `controlNameWithDate` composer (spec: "shared and reusable
  rather than per-control"); no two rows share an indistinguishable accessible
  name.
- The date string is the same `row.display` the row already computes, so the
  screenreader text and the visible card never drift (verified in the
  `proposed-dates-section.spec.tsx` assertions and the German compose smoke
  test).
- Labels exist in en + de; the composing step is a shared `controlNameWithDate`
  in the existing partials layer (`control-with-date.ts`) with its own focused
  render spec.
- The render spec asserts the per-row names behaviourally (via the rendered
  `aria-label`/`aria-describedby` strings) rather than by selector; the rival
  two-row spec covers `proposed-dates-section.tsx` alt text and shell-specific
  keyboard/axe surfaces are owned by the parallel tickets.

Out of scope correctly untouched: no changes to `proposed-dates-section.tsx`'
  tally/Dots logic, the vote/join views, or the clash-check surface.

No review-fix commit needed.
