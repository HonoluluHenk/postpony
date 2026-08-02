# 07 — Semantic-structure e2e regression net

**What to build:** A new e2e spec runs the axe accessibility scan plus targeted structural assertions across every route (start, create, edit including tallies, join, vote, scrape league → group → team → meetings, error), pinning the fixes from tickets 01–06 so they cannot silently regress.

**Blocked by:** 01 — Decorative icons hidden from the accessibility tree, 02 — Clean heading outline on the owner edit page, 03 — Vote-summary regions named exactly once, 04 — Join page: optional player-selection radios no longer claim required, 05 — Consistent error-container live region, 06 — Locale-consistent date-input language attribute.

**Status:** ready-for-agent

- [ ] axe `checkA11y` passes on every route.
- [ ] Structural assertions fail if any of the following regress: a decorative icon exposes glyph text; a heading level is skipped; an optional radio group claims required.
- [ ] The spec reuses the existing page objects and session fixtures for route setup.
- [ ] The full verify gate (lint, unit tests, build, e2e) passes with the new spec included.
