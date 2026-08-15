# 06 — Vote page: own-team results section

**What to build:** team members see how their own team is voting, by name, on the vote page. The vote page gains a results section for the voter's team: per-player votes by name per date (own team only) plus the existing own-team tally. Opponent members see opponent votes; organizer-team members see organizer-team votes. Neither team ever sees the other team's per-player names (the organizer still sees the opponent only as tallies in the edit view). Per AGENTS, any element rendered by an HTMX partial here must also exist in the initial template. New locale keys cover the results-section heading.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Vote page shows the voter's team's per-player votes by name per date plus the own-team tally.
- [ ] Team members see only their own team's names; the other team is never listed per-player.
- [ ] Results section stays consistent between partial and initial renders.
- [ ] Unit tests cover the vote-visibility filtering (own team per-player, other team names excluded).
- [ ] e2e: after a team member votes, the member's vote appears by name in the results section.