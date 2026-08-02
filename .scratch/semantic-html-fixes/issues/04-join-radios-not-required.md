# 04 — Join page: optional player-selection radios no longer claim required

**What to build:** On the join page, the "select an existing player" radio group is no longer announced as required. Picking an existing player and typing a new name remain mutually exclusive options; the participant is not told either field is mandatory.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] No radio input on the join page declares `aria-required` (and none declares the native `required` attribute).
- [ ] The participant can still join by selecting an existing player OR by typing a new player name.
- [ ] Existing join-page e2e tests pass.
