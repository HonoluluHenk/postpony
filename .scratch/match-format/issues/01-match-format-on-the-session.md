# 01: Match Format on the session

**What to build:** Every Postponement carries a Match Format — the number of players a side must field: a full-strength `maxPlayers` and a reduced-strength `minPlayers` floor, under a profile `name`. `PostponementRules.create` stamps the default format on new sessions, the session store gives rows written before the field existed the same default at read time, and the test session builder supplies it. Purely foundational: no user-visible change.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A `MatchFormat` is `{ name: string; minPlayers: number; maxPlayers: number }` and a single exported default declares the value every new Postponement gets — `{ name: 'STT Mannschaft', minPlayers: 2, maxPlayers: 3 }`.
- [ ] `Postponement` carries a required `matchFormat`; the handful of literal session constructions compile again after the change.
- [ ] Creating a Postponement returns the default format, and the creation input does not expose the format (hardcoded in one place for now).
- [ ] The read-time normalization gives a session without a `matchFormat` the default and leaves one that has a format alone; nothing is written back to storage.
- [ ] The test session builder returns the default format, and the builder drift spec asserts every required field including `matchFormat`.
- [ ] Unit coverage: creation, normalization (absent vs present, not rewritten), and builder drift.
- [ ] `name` is stored but read by no UI or logic.
