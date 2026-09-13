# 02: One-click GET /vote casting

**What to build:** A single browser click on a choice link casts the Vote: `GET /join/:id/:team/vote` with a valid invitation token, a Participant id on that team, and a `vote-<proposedDateId>=Yes|IfNecessary|No` query value records that Vote via the normal casting rule, saves the Postponement, and renders the voting poll with the new Vote shown. Re-clicking with a different value silently updates the existing Vote (re-voting semantics unchanged). A Confirmed Postponement keeps the existing confirmed-info redirect instead of casting.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A GET to the vote route carrying the three query values casts the Vote, saves, and renders the poll (a GET intentionally performs the state change — ponytail-commented as the one-click mail-link trade-off)
- [ ] A second click with a different choice updates the existing Vote, no confirmation page
- [ ] Values outside `Yes | IfNecessary | No` are ignored, matching the form submission today
- [ ] Bad or missing token → 403; unknown Postponement → 404; invalid team → 400, as today
- [ ] A Confirmed Postponement redirects to the confirmed-info view rather than casting

**Tested via:** handler suite around the existing GET vote route (cast, silent re-vote, guard statuses, confirmed redirect).