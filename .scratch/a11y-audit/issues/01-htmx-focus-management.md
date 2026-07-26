# 01 — Focus management after HTMX swaps and hx-boost navigation

**What to build:** After any HTMX partial swap (add player, add proposed date, change venue) or `hx-boost` navigation, programmatically move keyboard focus to a sensible location so screen-reader and keyboard users don't lose context.

**Status:** ready-for-agent

**Blocked by:** None — can start immediately.

## Scope

- **Partial swaps**: after POST to team-section, venue-section, proposed-dates-section — focus moves to the swapped section's heading or the `[role="alert"]` error on validation failure.
- **Boosted navigation**: after GET via `hx-boost` — focus moves to the `<h1>` in `#main-content`, and `document.title` is updated from the response.
- **Clipboard buttons**: the `<i role="button" tabindex="0">` clipboard elements lack keyboard handlers — but this is tracked separately in ticket 03.

## Acceptance criteria

- [ ] A reusable JS helper (in `main.js` or dedicated module) moves focus to the first `<h2>`–`<h4>` in the swapped target, or to `[role="alert"]` on validation failure
- [ ] All partial-swapping handlers (players-post, proposed-dates-post, venue-post) invoke the helper after successful swap
- [ ] Section headings used as focus targets have `tabindex="-1"` so they can receive programmatic focus
- [ ] After `hx-boost` navigation, focus moves to `#main-content` heading and `document.title` reflects the new page
- [ ] An e2e test verifies focus lands on the expected element after each type of swap
- [ ] `checkA11y()` passes after each interaction
