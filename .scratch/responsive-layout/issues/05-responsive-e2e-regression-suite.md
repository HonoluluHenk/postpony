# 05 — Responsive e2e regression suite

**What to build:** The holistic guarantee that no content is ever clipped at any viewport. A phone-width run of the edit page (a postponement seeded with a proposed date) must show no horizontal page overflow, with the header wrapped, tables stacked, and invitation links and their copy buttons reachable. A desktop assertion pins the container to 1200px, and an axe scan (WCAG 2.2 AA) confirms the stacked-table reflow stays accessible.

**Blocked by:** 01 — Widen the layout to 1200px, 02 — Wrap long text instead of clipping, 03 — Stack tables on small screens, 04 — Header reflows on phones

**Status:** ready-for-agent

- [ ] At a 375×667 phone viewport on the edit page, `document.documentElement.scrollWidth <= window.innerWidth` (no horizontal page overflow)
- [ ] At a phone viewport, invitation links are fully visible and their copy buttons clickable
- [ ] Desktop assertion: the container computes to a 1200px max-width
- [ ] Axe (WCAG 2.2 AA, via the existing fixture) passes on the stacked-table page
- [ ] Tests assert external behavior only (overflow geometry, computed styles, visibility/clickability) — no internal selectors or token names
- [ ] `npm run lint`, `npm run test`, `npm run e2e` pass

## Comments

- Spec: `.scratch/responsive-layout/spec.md`, "Testing Decisions".
- Prior art: the existing e2e files seed sessions through the shared page object and call the `checkA11y` fixture.
