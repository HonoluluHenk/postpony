# 04: Organizer edit page: Accepted chip & confirm message

**What to build:** the organizer's view drops the retired concept and names the consent in the new vocabulary. Each date shows an "Accepted" chip when the opponent accepted it, and no "Vetoed" chip. Confirming a date that is not Accepted, or that the opponent has taken out of their poll, is a no-op that surfaces a message naming the requirement (Accepted and still votable); a valid confirmation still succeeds end-to-end.

**Blocked by:** 03 — Opponent captain page: Votable & Accepted

**Status:** ready-for-agent

- [ ] The edit view shows an "Accepted" chip and no "Vetoed" chip.
- [ ] Confirming a valid date succeeds; confirming one that is not Accepted or no longer in the opponent's poll is a no-op with a message naming the requirement.
- [ ] No "veto"/"acceptable" wording remains on the organizer surface; German matches.
- [ ] The edit e2e confirm flows (valid and invalid) pass.
