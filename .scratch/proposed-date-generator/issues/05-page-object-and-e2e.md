# 05: Page Object method + E2E happy path

**What to build:** An organizer with an active Postponement can fill two weekday+time rows in the Generate form on the edit page, click Generate, and see the matching dates appear in the Proposed Dates list with a success toast and a status chip transition to `Voting`.

**Blocked by:** 03, 04

**Status:** ready-for-agent

- [ ] `EditPage` page-object gains a single high-level method that fills the listed rows in submission order and submits the form once.
- [ ] New e2e file under `e2e-tests/` covers the happy path with the original-Match datetime preset to a known value: organizer fills two weekday+time tuples, clicks Generate, sees the count toast, sees the dates in `#proposed-date-list`, sees the status chip transition to `Voting`.
- [ ] Follow-on assertion: re-submitting with the same tuples surfaces the inline empty-result message (no DB write, list unchanged).
- [ ] Generated Proposed Dates respond to the existing deletion flow — confirming ticket 03's "no regression on existing list controls" expectation.
- [ ] axe-core a11y check green on the open generator form.
- [ ] Previously passing e2e flows (`postponement-editing`, `postponement-creation`, `scraping-flow`, `localization`) remain green in the same boot of the Playwright server.
- [ ] Playwright boot isolated: ticket does not mutate `playwright.config.ts` or the e2e server port; runs in the existing runner.

## Comments
