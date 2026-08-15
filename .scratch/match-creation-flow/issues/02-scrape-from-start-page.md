# 02 — Scrape from start page; edit shows match summary

**What to build:** The creation fork completes on the start page: the organizer picks either manual creation or the click-tt scraper before anything else. The edit page stops offering scraping — instead it shows which match the Postponement is about (home vs guest, original date/time), so the organizer can confirm they're working on the right match.

**Blocked by:** 01 — Manual match-details creation

**Status:** ready-for-agent

- [ ] The start page shows three actions: create manually, find the match on click-tt.ch, edit an existing Postponement
- [ ] The click-tt wizard is reachable from the start page and mints a new Postponement exactly as today (rosters, typed match details, derived name)
- [ ] The scrape button is removed from the edit page; the freed cell shows a match summary (home vs guest, original date/time)
- [ ] The scheduling-info region stays partial-safe: nothing rendered by an HTMX partial depends on the removed button
- [ ] E2E: the scraping flow is entered from the start page and lands on the edit page showing the match summary and no scrape button
- [ ] `npm run verify` passes; coverage ≥80% for all metrics
