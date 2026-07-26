# 02 — Edit page form accessibility

**What to build:** Fix four a11y issues on the edit page that affect form error states, heading hierarchy, dynamic content announcements, and reduced-motion preferences. All are small, template-level changes in the same set of files.

**Status:** ready-for-agent

**Blocked by:** None — can start immediately.

## Sub-items

### A. Missing `aria-invalid` / `aria-describedby` on form error states

Four partial templates show an error message (with `role="alert"`) but the associated `<input>` is missing `aria-invalid="true"` and `aria-describedby="error-id"`:

- `src/routes/edit/id/team-section.eta` — home player name field (lines ~18-27)
- `src/routes/edit/id/team-section.eta` — away player name field (lines ~45-53)
- `src/routes/edit/id/venue-section.eta` — max overlaps field (lines ~7-12)
- `src/routes/edit/id/proposed-dates-section.eta` — datetime field (lines ~22-31)

Follow the pattern from `src/routes/create/create.eta`: conditionally add `aria-invalid` and `aria-describedby` pointing to the error element's `id`.

### B. Heading level skip: h1 → h3

The edit page body starts at `<h3>` (`src/routes/edit/id/edit.eta` line ~34) but the layout provides `<h1>`. There's no `<h2>`. Change the `<h3>` to `<h2>` and adjust any `vote-tally.eta` heading level parameter (if it passes `headingLevel: 4`, keep it passing `headingLevel: 3` now).

### C. Missing `aria-live` on dynamically swapped sections

The following swapped sections lack `aria-live` attributes:

- `#team-management` (team-section.eta)
- `#venue-management` (venue-section.eta)
- `#proposed-dates-management` (proposed-dates-section.eta)
- OOB elements `#error-container` and `#vote-tally-section`

Add `aria-live="polite"` to each swapped section element. This ensures screen readers announce content changes after partial swaps.

### D. Incomplete `prefers-reduced-motion` coverage

`src/public/assets/css/style.css` has `@media (prefers-reduced-motion: reduce)` that only disables the spinner rotation. Extend it to also disable:

- `.skip-link` `transition: top 0.2s` — set to `none`
- `.clipboard-btn` `transition: opacity 0.15s` — set to `none`

## Acceptance criteria

- [ ] A: All four partials conditionally set `aria-invalid="true"` and `aria-describedby` when an error exists
- [ ] B: Edit page heading hierarchy is h1 → h2 (no skip), `checkA11y()` WCAG 1.3.1 passes
- [ ] C: All swapped sections have `aria-live="polite"`, screen reader announces content changes
- [ ] D: `prefers-reduced-motion` disables skip-link and clipboard transitions
- [ ] No `checkA11y()` regressions across all e2e tests
