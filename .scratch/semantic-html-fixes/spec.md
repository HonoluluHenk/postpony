# Semantic HTML Fixes

Status: ready-for-agent

## Problem Statement

PostPony is committed to WCAG 2.2 AA (ADR-0004), and the templates are already mostly semantic — skip link, one `h1`, labelled inputs, proper tables. But a review of every `.eta` template found the remaining gaps between the visible UI and the accessibility tree:

- Decorative material-icon `<i>` elements leak their glyph text into the accessibility tree. The copy-to-clipboard buttons announce "Copy to clipboard, content_copy"; every player list item reads "person" before the name; every proposed date reads "event". This is the worst issue — it pollutes screen-reader output on the owner edit page.
- The edit page heading outline skips a level: `h1` → `h2` → `h3` → `h5`, with no `h4`.
- The vote-summary regions on the edit, proposed-dates partial, and join pages name themselves three times — section `aria-label`, `h3` heading, and table `<caption>` all say the same string.
- The join page marks its "pick an existing player" radio group `aria-required="true"`, but the group is optional (mutually exclusive with typing a new player name).
- The error container is a polite live region in the HTMX partial but not in the initial render — inconsistent, and redundant with the `role="alert"` inside it.
- The scrape-match table `<caption>` duplicates the page heading text.

None of these break the UI visually — they are purely semantic/accessibility-tree defects.

## Solution

Fix the template markup so the accessibility tree matches what is on screen:

- Every decorative icon is `aria-hidden="true"`; accessible names come only from visible text and `aria-label`.
- The heading outline is clean — no skipped levels.
- Each region is named exactly once.
- The join radio group no longer claims to be required.
- Live-region handling is consistent between the initial render and HTMX swaps.

The fix is markup-only; no domain logic, routes, or data shapes change.

## User Stories

1. As a screen-reader user on the edit page, I want decorative icons (`person`, `event`, `content_copy`) hidden from the accessibility tree, so that I hear "Copy to clipboard" and player/date names, not icon glyph names.
2. As a screen-reader user on the edit page, I want the heading outline to read `h1` → `h2` → `h3` → `h4` with no skipped levels, so that I can navigate the page's structure predictably.
3. As a screen-reader user, I want the vote summary for each team announced once, so that I do not hear the same title three times per section.
4. As a participant on the join page, I want the "select an existing player" radios not announced as required, so that I am not told a field is mandatory when it is optional.
5. As a screen-reader user, I want the scrape-match table to have a clear name, so that I know what the table lists when I enter it.
6. As a screen-reader user, I want a global error to be announced the same way whether it appears on first load or after an HTMX swap, so that I never miss a validation failure.
7. As a screen-reader user on any page, I want icons that already carry `aria-hidden="true"` to keep behaving as they do today, so that existing correct markup is not regressed.
8. As a maintainer, I want the semantic structure of every route pinned by automated checks, so that a future template edit cannot silently reintroduce these defects.
9. As a maintainer, I want the axe accessibility scan to continue passing on every page, so that the WCAG 2.2 AA baseline from ADR-0004 is preserved.
10. As an owner, I want no change in the visible layout or behaviour of the edit, join, vote, or scrape pages, so that this cleanup does not disturb anyone who is not using a screen reader.
11. As an owner, I want the date input's `lang` attribute to match the active locale rather than being hardcoded, so that dates are pronounced consistently with the rest of the UI (and to align with the locale-aware-dates work).
12. As a keyboard user, I want the copy buttons on the edit page to keep their accessible name and focus behaviour after the icon fix, so that the fix does not break the interaction.
13. As a screen-reader user, I want headings that receive programmatic focus after HTMX swaps to keep their `tabindex="-1"` focusable state, so that focus management keeps working.

## Implementation Decisions

### Decorative icon policy

- All material-icon `<i>` glyphs are decorative. Each one that lacks it gets `aria-hidden="true"`:
    - the `content_copy` glyphs on the two clipboard buttons (edit page),
    - the `person` glyphs in the home and away player lists (edit page and team partial),
    - the `event` glyphs in the proposed-date list (edit page and proposed-dates partial).
- The `<i>` elements that already carry `aria-hidden="true"` (`error`, `check_circle`, `info`) are unchanged.
- Accessible names continue to come from visible text or `aria-label` only — never from glyph text. On the clipboard buttons the `aria-label="Copy to clipboard"` (localized) is the single accessible name.

### Heading outline

- The "Home team" and "Away team" labels on the edit page and in the team partial change from `h5` to `h4`, so the outline reads `h1` → `h2` (scheduling info) → `h3` (management sections) → `h4` (teams) with no skipped levels.
- No heading text changes, only levels. The dynamic heading level in the vote-tally partial is unchanged (always passed `3`).

### Region naming

- The vote-summary wrapper `<section>` elements on the edit page, the proposed-dates partial, and the join page lose their `aria-label`. Their `h3` heading is the region's single name.
- The table `<caption>` in the vote-tally partial is kept: the caption names the table (per accessible-table practice) and the heading names the section — one name per element. The redundant third layer (section `aria-label`) is the layer being removed.
- The scrape-match table keeps its `<caption>` as its accessible name; the page heading above it names the page section. No change there beyond the review note being accepted.

### Optional group semantics

- The join page's "select an existing player" radio group loses `aria-required="true"`. The group is not required (the participant may instead type a new player name); a cross-field "one of the two is required" constraint is not expressed in HTML.

### Live regions

- The `aria-live="polite"` on the error-container partial is removed, so both the initial render and the OOB-swapped container have no container-level live semantics. The inner `role="alert"` div remains the (assertive, appropriate-for-errors) live region in both.
- The edit-page management sections keep `aria-live="polite"` — the swap-announcement plus `focusAfterSwap` double-path is intentional and left alone.

### Date input language

- The hardcoded `lang="de"` on the proposed-date datetime input is replaced by the resolved locale for the request, consistent with ADR-0016 and the in-progress `.scratch/locale-aware-dates/` work. If the locale-aware-dates feature lands first and already makes this attribute locale-driven, the only change needed here is to drop the hardcoded value; the implementer should reconcile against that feature's ticket set before editing.

### Explicitly left unchanged

- The layout `h1` (page title) duplicating the page `h2` text — a documented, test-enforced pattern.
- The `aria-live="polite"` on the three edit management sections — intentional (see above).

## Testing Decisions

- **One seam: the existing Playwright e2e suite** (`e2e-tests/`). The changes are markup-only; no unit seam on the reschedule domain module is warranted. All fixes are verified against the rendered DOM — external behaviour, not implementation details.
- **What makes a good test:** assertions on the rendered accessibility tree / DOM contract of each route — axe violations must stay empty, and the specific structural facts (every decorative icon hidden, clean heading outline, no false `aria-required`, consistent live regions) must hold. No snapshot/whitespace-level template assertions.
- **axe (`checkA11y` fixture) already covers:** heading order (the `heading-order` rule catches the `h3` → `h5` skip), duplicate IDs, and ARIA attribute misuse — on the routes that already call it.
- **Targeted structural assertions — what axe does not catch:** axe passes the clipboard buttons (their accessible name comes from `aria-label`, so the leaked glyph text is invisible to it) and does not flag `aria-required` on a radio group. A new set of rendered-DOM assertions covers these:
    - every `<i>` element has `aria-hidden="true"` (assert `page.locator('i:not([aria-hidden])')` count is 0 on the edit page and its partials),
    - the heading outline on each route has no skipped levels and exactly one `h1`,
    - the join page has no `input[type="radio"][aria-required]`.
    - These live either in a small helper next to `e2e-tests/fixtures.ts` or as per-page assertions, whichever keeps the page objects free of raw selectors.
- **New spec file:** `e2e-tests/semantic-structure.e2e.ts` loading each route (via the existing page objects and `test-session.ts` setup) and running both `checkA11y()` and the structural assertions. Routes: start, create, edit (owner + tallies), join, vote, scrape league → group → team → meetings, error.
- **Prior art:** `reschedule-editing.e2e.ts:217` ("should maintain accessibility on the editing interface") and `:221` (split-tallies a11y), the `checkA11y`/`makeAxeBuilder` fixtures in `e2e-tests/fixtures.ts`, and `focus-management.e2e.ts` for swap-focus expectations.

## Out of Scope

- Colour contrast, visual design, or any CSS change.
- The locale-aware-dates feature (`.scratch/locale-aware-dates/`) — only the hardcoded `lang` attribute cleanup touches it, and only if it has not already landed.
- Inline `<script>` blocks in the join/vote templates (CSP/behaviour, not semantics).
- air-datepicker internals beyond the existing `patchTimeSliderLabels` workaround.
- The intentional double-path of section `aria-live` plus focus management.
- The layout `h1`/`h2` duplication.

## Further Notes

- Governing standard is WCAG 2.2 AA per ADR-0004; the axe tags already include `wcag22a`/`wcag22aa`.
- The icon-text fix (user story 1) is the worst issue and is not catchable by automation — an axe run passes before and after. The structural assertions above are the regression net; a manual screen-reader spot check of the edit page is recommended but not blocked by it.
- The `lang` attribute decision overlaps `.scratch/locale-aware-dates/`; reconcile at implementation time to avoid a merge conflict.
