# 03: Unpersonalized Vote links degrade to who-are-you, intent preserved

**What to build:** A calendar file generated without an embedded Participant id still casts Votes, just with one extra step. Clicking a choice link whose `playerId` is unknown redirects the Participant through the existing who-are-you/register step — carrying the intended date and choice — and after picking who they are, the Vote lands automatically with the 01/02 mechanism, no re-selection.

**Blocked by:** 01 (Personalized one-click Vote links in the join export), 02 (One-click GET /vote casting)

**Status:** ready-for-agent

- [x] `GET /vote` with an unknown `playerId` and a pending `vote-<dateId>=<value>` redirects to the register step and preserves that pending choice through the redirect
- [x] The register POST's return redirect to the vote page appends the pending choice; since the intended date is votable and the identity is now known, the Vote casts automatically on arrival
- [x] A shared or stale file (no identity, or an identity that no longer matches a Participant) continues to produce a usable calendar and degrades to this flow rather than erroring
- [x] The landing page after the fallback flow shows the cast Vote on the poll

**Tested via:** handler suite (unknown-playerId redirect preserves intent; register-to-vote redirect appends it and the Vote lands) and the e2e error-path in 04.

## Comments

Implemented fallback intent: GET /vote with unknown playerId carries validated `vote-<dateId>=<value>` into the register step (form action + stored-identity bounce), and the register POST re-appends it to its /vote redirect so the Vote casts on arrival. SHAs: 281d565 (implementation), 9b88339 (tamper-surface tests: closed-date/invalid-value not carried), ab20a39 (review — approve, no fixes).