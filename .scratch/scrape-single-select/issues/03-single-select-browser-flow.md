# 03: Single-select browser flow

**What to build:** Driving the click-tt wizard in a browser, every Match row offers a single Select button; clicking it creates the Postponement with the correct derived side. The page object replaces its per-side create-button locator with a row-scoped select locator, and the scraping-flow suite exercises all three journeys end-to-end against fixture-served responses: derby guest leg → `organizerTeam` away, return-match leg → home, and the re-scrape change-mode journey preserving the session id.

**Blocked by:** 01 (Derive organizer side server-side), 02 (Match-list renders one select per row).

**Status:** ready-for-agent

- [ ] Page object exposes one row-scoped select-button locator; per-side locator removed
- [ ] Main flow asserts exactly one button per match row where the old flow asserted two
- [ ] Guest-leg journey lands on edit page with organizer roster under the guest list and opponent roster under home
- [ ] Return-match journey lands on edit page with sides flipped (organizer roster home)
- [ ] Re-scrape journey completes via single select: same session id, rosters replaced
- [ ] Full verify gate green: lint → test → build → e2e

## Comments
