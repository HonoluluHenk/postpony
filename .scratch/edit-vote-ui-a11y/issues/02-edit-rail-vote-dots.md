# 02: Edit rail: vote dots readable without sight

**What to build:** the per-player vote dots on each proposed-date card stop carrying their meaning only in a hover `title`. The group exposes each dot as "`<player>: <vote value>`" (or "no vote") through the accessibility tree, so a keyboard or screenreader user can audit who voted without seeing colour or hovering. The visual dots and the numeric `voted/total` text stay exactly as they are.

**Blocked by:** 01 — Edit rail: accessible per-row control names carry the date

**Status:** ready-for-agent

- [ ] The vote-dot group announces each player's vote ("Yes"/"If necessary"/"No"/"no vote") through the accessibility tree; no meaning lives only in `title`.
- [ ] Each dot is reachable and comprehensible without sight and without a pointer; the visual dots and the numeric count text are unchanged.
- [ ] The render spec asserts that the group's accessible labels map players to their votes and abstentions; a render spec or a11y check passes on the edit rail.