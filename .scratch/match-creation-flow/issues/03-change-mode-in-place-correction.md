# 03 — Change mode: in-place match-details correction

**What to build:** When the organizer picked the wrong match at creation, they can correct it from the edit page without losing the session. The "change match details" link reopens the manual form or the click-tt wizard in change mode; submitting updates the current Postponement in place — same id, passwords, votes, and proposed dates — while a manual change leaves the player list alone and a re-scrape swaps in the new match's rosters.

**Blocked by:** 01 — Manual match-details creation; 02 — Scrape from start page; edit shows match summary

**Status:** ready-for-agent

- [x] The edit page's match summary includes a "change match details" link opening the manual form in change mode, with a cross-link to the click-tt wizard
- [x] The manual form and the wizard thread `sessionId` + `ownerPassword` through their steps when in change mode; the final POST loads that session and checks the owner password before mutating it
- [x] A change updates the typed match details, derived name, and original date/time in place; id, passwords, votes, and proposed dates are preserved
- [x] A manual change leaves existing players untouched; a re-scrape replaces the rosters with the newly scraped ones
- [x] Wizard back-navigation in change mode returns to the edit page
- [x] Unit tests: change-mode handler (wrong/missing owner password rejected, same session mutated in place, players untouched on manual change, roster replaced on re-scrape)
- [x] E2E: a change round-trip preserves the session id and its players
- [~] `npm run verify` passes; coverage ≥80% for all metrics — lint/test/build green; e2e 66/66 at `--workers=4` (pre-existing load-flaky `join-voting` tests intermittently time out at full parallel); repo-wide coverage is pre-existing ~74%
