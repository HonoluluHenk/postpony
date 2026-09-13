# Review: 04-compact-header-invite-row-phone

Fixed point: `72b0e44` (chore: comments for 03-own-team-votes-stack-on-phone)
Commit reviewed: `9148eeb` ticket done: 04-compact-header-invite-row-phone

## Standards

No hard violations. Reviewed against AGENTS.md, the `css-styling` skill (tokens,
`@layer design`, BeerCSS-first), the `testing` skill (`setViewport`,
`checkA11y`, observable-behaviour assertions), and the code-review smell
baseline.

- Token change: `--h1-size` becomes a `clamp(1.5rem, 5vw, 2rem)` between a phone
  size and the existing 2rem desktop size, as the spec's Phase 1 decision
  requires. The stale "Pin h1 to a fixed size" comment was updated to match, not
  left contradicting the code.
- Markup: the two `<li class="row items-center gap wrap">` rows drop `wrap` in
  favour of `invite-link-row`, and the new selectors live in the existing
  `@layer design` block in `style.css`. `white-space: normal` uses the same
  override the existing `.list .max` rule uses to defeat BeerCSS list-nowrap.
- Clipboard idle opacity `0.5 → 0.75` keeps hover at `1`, so the idle state
  still reads as a control and stays distinct from hover. No token introduced:
  it is a single-use value (the css-styling "one repetition → token" rule does
  not fire), and raising it only improves WCAG contrast.
- e2e: the new test reuses `setViewport`, `EditPage.createSession`,
  `expectFullyInViewport`, `checkA11y`, and asserts observable geometry
  (bounding-box vertical overlap + no horizontal page overflow) rather than CSS
  property values. The `for...of` tuple keeps the home/away checks DRY.
- No smell baseline matches: no mysterious names, no speculative generality, no
  Feature Envy, no Data Clumps, no primitive obsession; the change is one
  concern (compact header + invite row).

Judgement call (not a violation): the new CSS comments are explanatory and
follow the file's established convention — the `.match-summary` note flags the
rule as interim (deleted in Phase 2), which is genuinely useful for ticket 06.
The repo's "no comments unless asked" is a general preference, not a hard rule
here; the surrounding code is heavily commented.

## Spec

Faithful to ticket 04 and the Phase 1 Implementation Decisions. All seven
acceptance criteria implemented and `npm run verify` passes (lint, test, build,
e2e — 106 passed):

1. `--h1-size` is a clamp between a phone size and the current 2rem desktop size.
2. The language selector stays in the header row on phone — the existing
   `max-width: 599px` header rule wraps the title onto its own line
   (`flex-basis: 100%`) while the logo and language `<select>` share the first
   row; the clamp change does not touch this.
3. Invitation link rows no longer wrap (`invite-link-row` overrides
   `.list li`'s `flex-wrap: wrap`), and the clipboard idle opacity is raised.
4. The match-summary paragraph wraps within the viewport
   (`.match-summary { min-width: 0; overflow-wrap: anywhere }`).
5. e2e at phone asserts the copy button and its link share the same vertical
   band and that no element exceeds the viewport width.
6. `checkA11y` passes at all widths; the screenshot baselines did not change
   (the clipboard opacity shift is far below the 2% screenshot tolerance), so no
   regeneration was needed.
7. `npm run verify` passes.

**One finding (fixed in `review-fixed`):** "the link may shrink" is only partly
met. BeerCSS applies `:is(ol,ul)>li>:is(a,label){white-space:nowrap}` to the
invite-link anchor (a direct `a` child of `li` in the `ul.list`), so the anchor
inherits `white-space: nowrap`. `overflow-wrap: anywhere` cannot break text under
`nowrap`, so a long team name would not wrap and, with `min-width: 0`, would
overflow the flex item instead of shrinking. The fix is to set
`white-space: normal` on `.list li.invite-link-row > a`, mirroring the existing
`.list .max` override.

No scope creep: the diff touches only the two CSS files, the two `li` rows in
`edit.tsx`, the responsive e2e spec, and the ticket file.

## Summary

Standards: 0 findings (1 non-issue judgement call). Spec: 1 finding, fixed in
`review-fixed`.
