# 05: E2E sweep to scrape-only

**What to build:** The end-to-end creation, scraping, and start-page flows verify the scrape-only world end to end. The happy path is: an organizer finds a Match through the click-tt wizard, a Postponement is minted, and they land on its edit page showing a read-only Match summary. Likely error paths cover a scrape submission carrying leftover change parameters (it behaves as a fresh mint and never mutates an existing Postponement) and an edit page with no change action.

**Blocked by:** 02 (Remove the manual create path), 03 (Make the scrape wizard mint-only), 04 (Edit page — read-only Match summary, no change action)

**Status:** ready-for-agent

- [ ] A full e2e flow scrapes a Match, mints a Postponement, and lands on its edit page with a read-only Match summary
- [ ] An e2e error path submits a scrape with leftover change parameters → fresh mint, existing Postponement untouched
- [ ] An e2e path confirms the edit page offers no change action
- [ ] e2e passing for the reworked creation/scraping/start-page flows
- [ ] `verify` gate (lint → test → build → e2e) green with all coverage ≥ 80%
