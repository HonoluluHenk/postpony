# Consolidate the edit-page redesign stylesheet into the design system

**Status:** done

## Problem Statement

The edit-page redesign was validated in a throwaway stylesheet (see `.scratch/edit-page-responsive-redesign/` and its `VERDICT.md`) that has since shipped as a permanent global asset. It is loaded on every page, yet it only serves the edit page. It bypasses the design system entirely: 83 literal `rem` values and zero spacing tokens, hardcoded colours, its own chip palette, and a `16px` font size. It also carries selectors left over from the pre-redesign layout that no template renders, and a "hall busy" warning chip whose amber small text fails WCAG 2.2 AA contrast (3.95–4.24:1 against a 4.5:1 minimum). Meanwhile the shared stylesheet has grown duplicate media queries and redundant `!important` declarations. Maintainers and agents cannot tell which tokens are authoritative, dead CSS is silently carried, and a user-facing warning is hard to read for low-vision users.

## Solution

Consolidate the prototype into the two sanctioned stylesheets and extend the design token catalog to express the redesigned edit page, so the design system is the single source of truth again. Delete the throwaway file. Remove the dead selectors, deduplicate the media queries and drop the redundant `!important` declarations. Bring the warning chip up to AA by reusing the existing warning container/on-container token pair. The result is visually the same edit page, with only two intentional changes: fine-grained values snap onto a real token scale, and the warning chip gains accessible contrast.

## User Stories

1. As a maintainer, I want all application styles to live in the two sanctioned stylesheets and the token file, so that there is one obvious place to look and change.
2. As a maintainer, I want no literal spacing, type, radius, or colour values in selectors, so that changing a value is a one-line token edit.
3. As a maintainer, I want dead selectors removed, so that I can trust that every rule in the stylesheet affects the running app.
4. As a maintainer, I want duplicate media queries merged, so that responsive behaviour is readable in one place per breakpoint.
5. As a maintainer, I want redundant `!important` declarations removed, so that the cascade is expressed by layer order rather than by escalation.
6. As a maintainer, I want the edit page's breakpoints aligned with the framework's medium breakpoint, so that responsive behaviour is consistent across pages.
7. As a maintainer, I want the redesign's spacing, typography, and radii expressed as named tokens, so that future edit-page work reuses them instead of inventing values.
8. As a maintainer, I want the edit page's font faces declared in the shared stylesheet with the rest of the styling, so that font loading has one owner.
9. As a low-vision user, I want the "hall busy" (Venue Occupancy) warning chip to meet WCAG 2.2 AA text contrast, so that I can read it.
10. As a sighted user, I want the warning chip to match the existing occupancy warning treatment, so that warning styling is consistent across the edit page.
11. As a maintainer, I want the chip palette to use the theme's container/on-container pairs where they exist, so that chips survive a theme change.
12. As an agent, I want the CSS architecture documentation to reflect the real files and token catalog, so that I make correct changes without re-discovering the layout.
13. As a maintainer, I want the migration landed in staged, independently verifiable commits, so that any visual regression is attributable to a single change.
14. As a maintainer, I want the visual regression baselines updated deliberately and reviewed, so that unintended drift is caught rather than rubber-stamped.
15. As a maintainer, I want the full verification gate (lint, unit, e2e) to pass, so that the refactor is proven not to break behaviour.
16. As an organizer on desktop, I want the edit page to look and behave exactly as before the consolidation, so that the refactor is invisible to me.
17. As an organizer on a phone, I want the stacked edit layout to remain correct after the breakpoint unification, so that nothing overlaps or clips.
18. As a screen-reader user, I want the edit page's semantics and accessible names unchanged, so that the refactor does not alter what I hear.
19. As a participant, I want the join and vote pages unaffected, so that a refactor scoped to the edit page never touches my flow.
20. As a maintainer, I want the migrated rules to remain scoped to the edit page, so that new global selectors do not leak onto other pages.
21. As a maintainer, I want the edit page's maximum content width and sidebar width expressed as tokens, so that layout constants are discoverable.
22. As a maintainer, I want the debug and prototype throwaways excluded from the shipped asset set, so that only sanctioned stylesheets are linked.

## Implementation Decisions

**Modules**

- `design-tokens.css`: gains the dense spacing half-steps, the type scale, radius tokens, layout-width tokens, and semantic chip colour tokens. Existing `--space-1..6`, `--primary`, `--border-radius`, and the font/palette tokens are untouched.
- `style.css`: absorbs the live `edit-redesign.css` rules into a commented edit-page section inside the existing `@layer design` block, plus the six `@font-face` declarations above the layer block.
- The main layout module: drops the `edit-redesign.css` stylesheet link.
- `edit-redesign.css`: deleted.
- The `css-styling` skill doc: updated file list and token catalog; stale `main.eta` reference corrected to `main.tsx`.

**Token catalog** (values chosen during the prototyping session; the strict scale snaps the prototype's arbitrary values, at most ~2px spacing and ~1px type drift)

- Spacing additions: `--space-0-5` (0.125rem), `--space-1-5` (0.375rem), `--space-2-5` (0.625rem), `--space-3-5` (0.875rem), `--space-4-5` (1.25rem), `--space-7` (4rem). Existing `--space-1/2/3/4/5` absorb 0.25/0.5/0.75/1/1.5.
- Type: `--font-size-xs` (0.75rem), `--font-size-sm` (0.85rem), `--font-size-md` (0.9rem), `--font-size-base` (1rem), `--font-size-lg` (1.1rem), `--font-size-xl` (1.3rem).
- Radius: `--radius-pill` (999px), `--radius-card` (8px), `--radius-sm` (6px).
- Layout: `--sidebar-width` (300px), `--date-cell-width` (11rem), `--edit-max-width` (72rem).
- Colour: white card surfaces reuse BeerCSS `--surface-container-lowest`; chip tints become semantic tokens preserving current values in the first pass (`--chip-clean-bg`, `--chip-warn-bg`, `--chip-error-bg`); the warning chip is then repointed to `--warning-container` / `--on-warning-container`.

**Cascade**

- The app layer (`design`) already outranks the vendor layer (`vendor`), so the `!important` declarations on the picker button are redundant and removed; the picker button's positioning is expressed by selector specificity within the design layer.
- Edit-page rules keep the `.edit-redesign` wrapper scope; the page-headline rules stay unscoped because the headline renders in the shared layout header, outside that wrapper.

**Responsive**

- The edit page's `1024px`/`1023px` breakpoints are replaced by the framework's `993px`/`992px` medium breakpoint already used by the shared stylesheet.

**Dead code**

- Removed from the migrated rules: the generator-grid, not-joined, and roster rule sets.
- Removed from the shared stylesheet: clipboard-btn, heading-row, invite-link-row, and the proposed-date card/list rule sets.

**Process**

- Staged commits: (1) prune dead selectors, merge media queries, drop redundant `!important`; (2) fold the redesign into the shared stylesheets and tokenize, deleting the old file; (3) fix warning-chip contrast; (4) docs.
- Snapshot baselines are regenerated only in the two commits that intentionally change appearance, and the diffs are reviewed before committing.

## Testing Decisions

- A good test asserts what a user or screen reader observes, not the shape of the CSS. For this refactor the authoritative signal is the rendered edit page: its screenshot baselines and its accessibility checks.
- The existing seam is the Playwright screenshot suite co-located with the edit end-to-end tests, backed by committed baselines (ADR-0005). No new seams are introduced; the ideal count is one and this refactor stays at it.
- The edit page's end-to-end test covers the happy path and error paths; its committed snapshots guard against unintended visual drift. Baseline updates are intentional and reviewed.
- Accessibility checks (axe via the e2e fixtures) must remain green, and the warning chip's contrast is verified by the same checks.
- Unit tests that assert edit-page class names and structure continue to pass unchanged; they are not updated by this refactor.
- The full gate (`lint`, `test`, `build`, `e2e`) is the completion criterion.

## Out of Scope

- Restyling any page other than the edit page, and any change to the edit page's markup, class names, or interaction.
- Migrating or editing the vendored BeerCSS and air-datepicker stylesheets.
- Tokenizing pre-existing literal values in the shared stylesheet beyond the dead-code removal and media-query deduplication (for example the generator field widths).
- Dark-theme support; the app remains fixed to its light theme.
- The debug prototype worktrees.
- Any new edit-page feature or layout change.

## Further Notes

- Relevant ADRs: 0004 (WCAG 2.2 AA), 0005 (Playwright visual regression), 0019 (JSX templates). Domain vocabulary follows `CONTEXT.md`.
- The breakpoint unification moves the switch from stacked to two-column between 993–1023px; the committed desktop baselines (1280px) are unaffected, but the range should be spot-checked.
- Strict tokenization shifts a small number of values by up to ~2px; this is the only intended drift alongside the contrast fix.
