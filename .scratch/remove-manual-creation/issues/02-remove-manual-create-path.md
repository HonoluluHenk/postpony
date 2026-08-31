# 02: Remove the manual create path

**What to build:** Hand-entry creation no longer exists. The start page offers no manual "create a Postponement by typing teams and date/time" path, and that manual create route no longer renders a form or mints a Postponement from hand-typed details. The manual form handler, its component, and its specs are deleted; the start page's creation entry points only at the click-tt scrape wizard. The shared change-mode helper is intentionally left in place (the scrape wizard still uses it) for a later ticket to remove.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The manual create route no longer exists: a request to it renders no hand-entry form and mints no Postponement
- [x] The start page offers exactly one creation entry — the click-tt scrape wizard
- [x] The manual form component, its route handlers, and their unit specs are deleted
- [x] No route accepts hand-typed home/guest team or date/time to mint a Postponement
- [x] `verify` gate (lint → test → build → e2e) green with all coverage ≥ 80%

## Comments

Implementation: `904cbc1` (manual create route/components/specs deleted; start page scrape-only; verify gate green via the e2e sweep in 05).
