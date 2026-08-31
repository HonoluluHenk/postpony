# 03: Make the scrape wizard mint-only (remove change mode)

**What to build:** The scrape wizard can no longer re-point an existing Postponement at a different Match. All change-mode context (`sessionId` + `ownerPassword`) is stripped from the wizard's step views, and the wizard's final scrape handler creates a brand-new Postponement on every run — never reusing an existing session's id, passwords, or rosters. Submitting a scrape with leftover change parameters behaves as a fresh mint and never mutates an existing Postponement. The now-unused shared change-mode helper is deleted.

**Blocked by:** 02 (Remove the manual create path)

**Status:** ready-for-agent

- [ ] A scrape POST always mints a new Postponement (new id, new owner/invitation passwords)
- [ ] A scrape POST carrying `sessionId` / `ownerPassword` parameters never mutates the referenced existing Postponement (acts as a fresh mint)
- [ ] The wizard's step views no longer thread change-mode context through their links or renders
- [ ] The shared change-mode helper (owner-password guard + change-suffix threading) is deleted
- [ ] Unit specs for the scrape wizard / final scrape handler updated to mint-only behaviour
- [ ] `verify` gate (lint → test → build → e2e) green with all coverage ≥ 80%
