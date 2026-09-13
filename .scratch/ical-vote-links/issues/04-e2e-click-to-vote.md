# 04: E2E click-to-vote flow

**What to build:** Proof, from a real browser, that a calendar file turns into a cast Vote. A Participant on the voting poll downloads the personalized calendar, opens a choice link pulled from a Proposed Date's `DESCRIPTION`, and returns to the poll to see that Vote cast. A second scenario walks the degraded path: a Vitest link carrying no `playerId` routes through the register step and still lands the Vote.

**Blocked by:** 01 (Personalized one-click Vote links in the join export), 02 (One-click GET /vote casting), 03 (Unpersonalized Vote links degrade to who-are-you, intent preserved)

**Status:** ready-for-agent

- [x] Happy path: from the voting poll, download the personalized `.ics`, extract a `vote-<dateId>=IfNecessary` link from its `DESCRIPTION`, open it, and assert the poll shows that Participant's Vote on that date
- [x] Error path: a `vote-<dateId>=Yes` link with no `playerId` routes through who-are-you and, after registering, lands the Vote without re-selecting the choice
- [x] The `.ics` attachment still arrives with `text/calendar` and the existing `Content-Disposition` filename

**Tested via:** the Playwright flow spec extending the existing join e2e.