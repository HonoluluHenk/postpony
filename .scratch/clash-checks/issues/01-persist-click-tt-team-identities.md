# 01: Persist click-tt team identities at scrape-creation

**What to build:** When the owner creates a match via the scrape wizard, the Postponement stores both teams' click-tt identities (`championship`, `group`, `teamtable`) in typed, optional fields — the wizard already holds them in hand, so this is capture at the source (ADR-0022). Matches entered by hand keep no identity. Existing stored sessions without the fields keep working unchanged.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A scrape-created Postponement stores both teams' `(championship, group, teamtable)` as typed fields
- [ ] A hand-entered Postponement stores no identity fields
- [ ] Sessions without the identity fields load and render unchanged (backwards compatible)
- [ ] Unit coverage for the creation paths and the builder fixtures