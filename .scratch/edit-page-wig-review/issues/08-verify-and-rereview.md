# 08: Verify and re-review

**What to build:** The full CI gate passes with all fixes landed, and a fresh Web Interface Guidelines review of the live edit page reports only the three intentionally deferred items.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07

**Status:** ready-for-agent

- [x] `npm run verify` (lint, test, build, e2e) passes
- [x] Coverage stays at or above 80% for all metrics
- [x] Re-run the web-design-guidelines review against the edit page URL; remaining findings are limited to: language select as links, shared single delete dialog, `beforeunload` guard for the generator form
- [x] Spec's Out of Scope section still matches the remaining findings; update it if anything else was consciously deferred
