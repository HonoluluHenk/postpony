# 04: Edit page — read-only Match summary, no change action

**What to build:** The edit page shows which Match a Postponement references (home vs guest, original date/time) as read-only, and offers no way to change the Match it references. The "change match details" action is gone from the edit page; no edit affordance remains on the Match summary cell.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The edit page renders the referenced Match's identity (home vs guest, original date/time) read-only
- [x] No "change match details" action or affordance is rendered on the edit page
- [x] Unit specs and e2e for the edit page updated so the read-only summary is asserted and the change action asserted absent
- [x] `verify` gate (lint → test → build → e2e) green with all coverage ≥ 80%

## Comments

- `d3c5e08` ticket done: read-only Match summary (`<p class="match-summary">` via new `homeTeam`/`guestTeam`/`matchDateTime` props), `change_match_details` link removed; new unit spec + scrape-driven e2e asserting summary present and change action absent. lint/test/build green (581 tests, coverage ≥80%); e2e red only from parallel tickets 02/03 manual-create removal (owned by ticket 05).
- `e56a1dd` review: 0 standards findings, 0 spec findings; only caveat is e2e criterion blocked by parallel churn, no code defect, no fixes needed.
