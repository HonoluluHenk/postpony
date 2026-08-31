# 01: Simplify the Postponement model & session store

**What to build:** The scrape-`metadata` provenance field no longer exists on the Postponement model, so a Postponement is created carrying only its click-tt team identities (`homeTeamIdentity` / `guestTeamIdentity`) and no provenance blob. Reading a stored Postponement no longer runs the legacy `metadata.match` field migration. All model consumers, builders, and stored-session normalization agree on the simplified shape.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The `metadata` field is gone from the Postponement model and from all creation-write sites (both create paths stop writing it)
- [x] Reading a stored Postponement no longer applies the legacy `metadata.match` → typed home/guest field migration
- [x] `homeTeamIdentity` / `guestTeamIdentity` remain on the model untouched
- [x] Unit specs for model builders and session-store normalization updated to the simplified shape
- [ ] `verify` gate (lint → test → build → e2e) green with all coverage ≥ 80%
