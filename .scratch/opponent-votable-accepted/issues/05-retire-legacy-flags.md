# 05: Retire legacy Vetoed & Acceptable

**What to build:** the old flags and setters are gone from the type and the code. Legacy keys survive only as read-time input: a session persisted before the change still normalizes into the new flags, so a previously rejected date remains outside the opponent's poll and unconfirmable, and a previously accepted date remains confirmable.

**Blocked by:** 04 — Organizer edit page: Accepted chip & confirm message

**Status:** ready-for-agent

- [ ] A Proposed Date no longer carries `vetoed` or `acceptable`, and no code reads or writes them.
- [ ] A session persisted before the change loads with the equivalent new flags and the same behaviour (rejected stays unpollable and unconfirmable; accepted stays confirmable).
- [ ] The full unit and e2e suites pass with the legacy flags removed.
