# 04: Edit page — read-only Match summary, no change action

**What to build:** The edit page shows which Match a Postponement references (home vs guest, original date/time) as read-only, and offers no way to change the Match it references. The "change match details" action is gone from the edit page; no edit affordance remains on the Match summary cell.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The edit page renders the referenced Match's identity (home vs guest, original date/time) read-only
- [x] No "change match details" action or affordance is rendered on the edit page
- [x] Unit specs and e2e for the edit page updated so the read-only summary is asserted and the change action asserted absent
- [x] `verify` gate (lint → test → build → e2e) green with all coverage ≥ 80%
