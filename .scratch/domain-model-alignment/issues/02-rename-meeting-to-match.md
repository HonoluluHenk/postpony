# 02 — Rename Meeting → Match

**What to do:** The canonical domain term for the fixture being postponed is "Match" (`CONTEXT.md`); the scraper and scrape-flow code still call it "Meeting" (a click-tt.ch artifact). Rename the code to the canonical term while keeping the click-tt URL/param names (`meetings` route, `meeting` metadata) untouched unless they leak into the UI.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `src/lib/click-tt-scraper.ts`: rename the `Meeting` interface and `fetchMeetings` → `Match` / `fetchMatches`; update doc comments.
- [ ] Update `src/lib/click-tt-scraper.spec.ts` identifiers/descriptions.
- [ ] `src/routes/create/scrape/meetings-get.ts` and `meeting-post.ts`: rename handler-local `meeting` variables; keep the `meeting` metadata key and `meeting.eta` unless we also rename the route.
- [ ] `src/routes/create/router.ts`: decide whether `/scrape/meetings` + `/scrape/meeting` stay (click-tt vocabulary) or become `/scrape/matches` + `/scrape/match`; keep e2e tests in lockstep.
- [ ] `src/lib/temporal-utils.ts:129`: update the "meeting" reference in the `parseClickTtDateTime` comment.