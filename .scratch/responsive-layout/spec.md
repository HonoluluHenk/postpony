# Responsive Layout & Page Width

**Status:** ready-for-agent

## Problem Statement

On desktop, PostPony renders as a narrow 800px column, wasting most of the screen on modern monitors. The edit page's three-column management grid is cramped inside that column, and long text (localized proposed-date strings, invitation-link URLs) overflows its column and breaks the layout. On phones, the same long text, the vote/meeting tables, and the header row overflow the viewport and get silently clipped by `overflow-x: hidden`, making content and controls unreachable.

## Solution

The app uses the full available width up to a 1200px cap, giving the edit page's columns real breathing room. On small screens the layout adapts instead of clipping: long text wraps, the header reflows, and tables stack into labeled cards. Every element is readable, reachable, and interactive at any screen size, including for screen-reader users.

## User Stories

1. As a club owner editing a postponement on a desktop monitor, I want the page to use up to 1200px of my screen, so that the management grid isn't a narrow column in the middle of the display.
2. As a club owner editing a postponement, I want the proposed-date strings to wrap within their column instead of pushing the "away team votable" switch out of view, so that I can see and toggle every row.
3. As a club owner, I want the invitation links to wrap when they're long, so that I can see the full URL and reach its copy button.
4. As a participant on a phone, I want the vote page's tally table to stack into labeled rows, so that I can read the Yes/Maybe/No counts without horizontal scrolling.
5. As a club owner on a phone, I want the scrape-wizard meetings table to stack into labeled rows, so that I can scan matches and tap "Create session" without pinching or scrolling sideways.
6. As a participant on a phone, I want the header to reflow so the page title wraps onto its own line, so that I can always see which page I'm on.
7. As a visitor on a tablet, I want the half-width vote-tally sections' tables to stack below 993px, so that they don't overflow their ~370px columns.
8. As a user on any device, I want horizontal page overflow to be impossible, so that no content is ever clipped at the page edge.
9. As a screen-reader user, I want stacked tables to keep real table semantics, so that the reflow doesn't degrade my reading experience.
10. As a screen-reader user, I want each stacked row's cell to announce its column label, so that numbers remain attributable to their columns.
11. As a developer, I want an automated check that the layout doesn't overflow a phone viewport, so that this regression class is caught in CI.

## Implementation Decisions

- **Container width:** raise the `--container-max-width` design token from `800px` to `75rem` (1200px). This matches BeerCSS's own ceiling for `main.responsive`, so the framework and app agree; below 1200px the container stays fluid (already `width:100%`).
- **Long text: wrap, never truncate.** List rows whose text sits in a flex `.max` box get `white-space: normal` + `min-width: 0` so the flex item can shrink and the text breaks instead of blowing out. This covers proposed dates and player names.
- **Invitation links:** the two invite rows in the edit view switch from no-wrap to wrapping so long `?token=` URLs break instead of clipping.
- **Header:** below 600px the header row is allowed to wrap, dropping the page title onto its own line; no truncation.
- **Tables stack below 993px** (`m` + `s` tiers) via CSS reflow — the point at which the vote-tally sections become half-width and can't hold a real table:
    - `thead` visually hidden (clip pattern), `tr`/`td` rendered as block, `td[data-label]::before` prints the column label above each cell value.
    - Real `<table>`/`caption` semantics preserved in the accessibility tree.
- **`data-label` attributes** added to every `<td>` in the vote-tally partial and the scrape meetings table, populated from the already-translated header strings (including the visually-hidden Actions column). The vote-tally partial is shared, so this covers the edit page, its HTMX partial swap, and the join vote page from one edit — respecting the partial/initial-render sync gotcha.
- **Keep `main { overflow-x: hidden }`** as a page-level safety net; it no longer clips reachable content once the above fixes land.
- Grid arrangements themselves are unchanged: the edit page keeps `s12 m4` / `s12 m6`; only the width they render into changes.

## Testing Decisions

- **One seam:** Playwright e2e at the rendered-HTML/browser level — the only place CSS behavior is observable. Unit tests do not cover layout.
- **What makes a good test:** assert external, observable behavior only — overflow geometry, computed styles, and element visibility/clickability — never selectors or token names as implementation details.
- **New `responsive.e2e.ts`** (prior art: `reschedule-editing.e2e.ts`, `fixtures.ts`, `pages/EditPage.ts`):
    - Phone viewport (`375×667` via `page.setViewportSize`) on a session seeded through `EditPage.createSession` with a proposed date added:
        - `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal page overflow);
        - the header/title is visible after reflow (wrapped);
        - the vote-tally table is stacked (row cells render as blocks, `thead` hidden);
        - invitation links are fully visible and their copy buttons clickable.
    - Desktop viewport: `.container` computed `max-width` resolves to `1200px`.
    - `checkA11y` on the stacked-table page (WCAG 2.2 AA via the existing axe fixture) to confirm the reflow keeps the page accessible.
- Prior art for the axe assertion: every existing e2e file calls `checkA11y()`.

## Out of Scope

- Changing the grid column arrangement (`s12 m4`, `s12 m6`) or spacing tokens on the edit page.
- Horizontal-scroll table wrappers — stacking was chosen instead.
- Truncation/ellipsis for long text or URLs.
- Per-device layouts beyond the listed breakpoints (600px header wrap, 993px table stack).
- Any content, copy, or localization changes.
- New ADRs or glossary terms — presentation-only, trivially reversible, no domain vocabulary touched (verified against the 14 existing ADRs and `CONTEXT.md`).

## Further Notes

- The BeerCSS `main.responsive` cap (`75rem`) already matches the new container cap, so there's no layered-conflict cleanup.
- This was shaped by a grilling session (decisions: 1200px cap, wrap-not-truncate, stack-not-scroll, 993px stack breakpoint, 600px header wrap, e2e verification).
