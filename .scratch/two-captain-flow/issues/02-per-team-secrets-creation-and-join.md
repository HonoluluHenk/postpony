# 02: Per-team secrets, creation & join

**What to build:** creating a postponement mints four random secrets (organizer-captain, opponent-captain, home-player, away-player), and a player can only join and vote with their own team's password. The edit page renders the home-player and away-player share links; the legacy shared invitation password is retired.

**Blocked by:** 01 — Four-secret model & domain rules

**Status:** ready-for-agent

- [x] Creating a postponement mints four random secrets, stores all four hashes, and persists the three shareable plaintexts (opponent-captain, home-player, away-player).
- [x] A home player joins via the home-player password; an away player joins via the away-player password.
- [x] A token that does not match the team in the join path is refused with a translated 403, and never grants vote access.
- [x] The edit page renders home-player and away-player share links carrying the correct per-team tokens.
- [x] The legacy shared invitation password field is removed with no dangling references.
- [x] Unit specs cover the per-team join guard; e2e covers join-and-vote with the correct team password and refusal with the wrong team's password.

## Comments

- `83266c0` feat(join): per-team player secrets and creation minting
