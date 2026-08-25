# 03: Single-select browser flow

**What to build:** Driving the click-tt wizard in a browser, every Match row offers a single Select button; clicking it creates the Postponement with the correct derived side. The page object replaces its per-side create-button locator with a row-scoped select locator, and the scraping-flow suite exercises all three journeys end-to-end against fixture-served responses: derby guest leg → `organizerTeam` away, return-match leg → home, and the re-scrape change-mode journey preserving the session id.

**Blocked by:** 01 (Derive organizer side server-side), 02 (Match-list renders one select per row).

**Status:** done

- [x] Page object exposes one row-scoped select-button locator; per-side locator removed
- [x] Main flow asserts exactly one button per match row where the old flow asserted two
- [x] Guest-leg journey lands on edit page with organizer roster under the guest list and opponent roster under home
- [x] Return-match journey lands on edit page with sides flipped (organizer roster home)
- [x] Re-scrape journey completes via single select: same session id, rosters replaced
- [x] Full verify gate green: lint → test → build → e2e

## Comments

- `ScrapePage.createButton(teamName)` replaced by row-scoped `selectButton(rowFilter)` (`getByRole('button', {name: 'Select'})` inside `matchRow(filter)`); `matchRowButtons` kept for count assertions.
- Main flow now asserts table-wide exactly-one-button-per-row (14 match rows → 14 buttons) plus row-scoped count 1 on the derby leg — a reintroduced per-side pair fails loudly on both.
- All three journeys (guest leg → 'away' rosters, return leg → 'home' rosters, re-scrape change mode preserving session id) drive selection via the single Select button.
- Verify results: lint clean (tsc ×2 + eslint), 307 unit tests passed (coverage 87.0% stmts / 78.0% branch — branch figure pre-existing from earlier tickets), build ok, 69 e2e tests passed.
