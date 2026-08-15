# 05 — Team-facing join/vote flow: pre-proposal empty state, confirmed-info view, registration gate

**What to build:** the join and vote routes behave correctly across the whole status lifecycle, for both teams. Before the organizer has proposed any date (`Draft`, nothing `votableByOpponent`), the opponent can still register a name — plain register form, no banner — and after registering sees an empty vote page with a hint that the organizer is still deciding which dates to propose; the tally/results section stays hidden. The own team is unaffected pre-proposal. Once the postponement is `Confirmed`, both the join route and the vote route render a pure-info confirmed view instead: the chosen date shown, no registration, no voting (the existing server-side read-only gate stays as a backstop). Registration is blocked only when `Confirmed`; a blocked registration redirects to the confirmed view rather than an error page. Unregistered visitors on the vote route keep redirecting to the join form. This ticket is the home of the full happy-path e2e (propose → own-team votes → propose to
opponent → opponent votes → confirm → confirmed-info view) and the error-path e2e (registration blocked after confirm, opponent pre-proposal empty state). Rewritten wording for the empty-state hint and confirmed view is UI fog, settled via the localization skill.

**Blocked by:** 01, 04

**Status:** ready-for-agent

- [ ] Opponent registers pre-proposal (plain form, no banner); registration is blocked only when `Confirmed`.
- [ ] Registered opponent pre-proposal sees the empty-state hint; tally/results hidden pre-proposal; own team unchanged.
- [ ] `Confirmed` renders the confirmed-info view on both join and vote routes (chosen date, no registration, no voting).
- [ ] Blocked registration after confirm redirects to the confirmed view, not an error page.
- [ ] Unregistered visitor on the vote route still redirects to the join form.
- [ ] Confirmed-info view and empty-state wording follow the localization skill (fog items settled there).
- [ ] Unit tests: registration blocked when `Confirmed`, opponent empty state pre-proposal, confirmed view rendering.
- [ ] e2e full happy path: propose → own-team votes → propose to opponent → opponent votes → confirm → confirmed-info view.
- [ ] e2e error paths: confirm of a non-proposed date not possible; registration blocked after confirm; opponent pre-proposal empty state.
