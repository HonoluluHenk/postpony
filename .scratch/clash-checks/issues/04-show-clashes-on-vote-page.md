# 04: Show clashes on the vote page

**What to build:** Participants voting on a Postponement see the same stored Clash information per Proposed Date that the owner sees: one line per affected team with the game's localized time and opponent, "checked, no clashes" when the check ran clean, "not checked" for hand-entered matches, nothing on failed checks. Voting behavior itself is unchanged.

**Blocked by:** 03

**Status:** done

- [x] Each Proposed Date on the vote page shows its stored clash lines and states
- [x] Voting (Yes/Maybe/No) is unaffected by the presence or absence of clash data
- [x] A11y checks pass on the updated vote page