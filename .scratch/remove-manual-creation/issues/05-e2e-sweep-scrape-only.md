# 05: E2E sweep to scrape-only

**What to build:** The end-to-end creation, scraping, and start-page flows verify the scrape-only world end to end. The happy path is: an organizer finds a Match through the click-tt wizard, a Postponement is minted, and they land on its edit page showing a read-only Match summary. Likely error paths cover a scrape submission carrying leftover change parameters (it behaves as a fresh mint and never mutates an existing Postponement) and an edit page with no change action.

**Blocked by:** 02 (Remove the manual create path), 03 (Make the scrape wizard mint-only), 04 (Edit page — read-only Match summary, no change action)

**Status:** ready-for-agent

- [x] A full e2e flow scrapes a Match, mints a Postponement, and lands on its edit page with a read-only Match summary
- [x] An e2e error path submits a scrape with leftover change parameters → fresh mint, existing Postponement untouched
- [x] An e2e path confirms the edit page offers no change action
- [x] e2e passing for the reworked creation/scraping/start-page flows
- [x] `verify` gate (lint → test → build → e2e) green with all coverage ≥ 80%

## Comments

Swept the e2e suite to scrape-only: `EditPage.createSession` now drives the click-tt wizard (CreatePage deleted), the happy path mints via scrape and lands on the read-only Match summary, the error path proves a leftover `sessionId`/`ownerPassword` scrape POST mints fresh without mutating the existing Postponement, and the edit page asserts no change action. Commits: `4e859fc` (page objects), `14a3ac8` (specs/flows), `6aa065f` (ticket done), `e1be8f1` (review), `3d45d22` (review-fixed). Verify green: lint/test/build pass, coverage ≥ 80% (stmts 88.9%, branch 80.8%, funcs 92.9%, lines 88.9%), e2e 88/88.
