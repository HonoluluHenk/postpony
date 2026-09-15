# 01: Expand Proposed Date with Opponent Votable & Accepted

**What to build:** the domain shape gains the new flags *beside* the old ones so nothing breaks. A Proposed Date carries `opponentVotable` (on by default) and `accepted` (off by default) in addition to the legacy `vetoed`/`acceptable`; every operation that touches a date keeps each pair in sync, and stored sessions normalize into the new fields at read time. This is the prefactor for the rename: no user-visible behaviour changes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A Proposed Date exposes `opponentVotable` (default on) and `accepted` (default off) alongside the legacy flags.
- [ ] Every domain operation that sets or clears a date flag writes both the new flag and its legacy counterpart, so the two can never disagree.
- [ ] Read-time normalization derives the new fields from stored legacy data and keeps the legacy fields populated for existing readers; nothing is rewritten in storage.
- [ ] Fixture builders can construct sessions carrying the new fields.
- [ ] The full unit suite stays green with no user-visible change.
