# 05: Manual refresh of the schedule check

**What to build:** The owner gets an action on the edit page that re-runs the schedule check on demand: both teams' schedules are fetched again, Clashes recomputed for all Proposed Dates, and the stored snapshot replaced. The refreshed results render immediately in the existing states. The action is only offered for Postponements that have team identities; a failed refresh keeps the old snapshot and shows the failure state.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Refresh re-fetches both schedules, recomputes all Clashes, and updates the stored snapshot
- [ ] The refreshed rows render immediately
- [ ] A failed refresh keeps the previous snapshot and degrades gracefully
- [ ] No refresh action is offered for hand-entered matches