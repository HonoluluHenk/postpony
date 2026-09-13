# 03: Export from the join/vote pages

**What to build:** From the participant's vote page — both the Voting poll step and the Confirmed-info step — a link downloads the same calendar file as ticket 02, so both teams receive the identical file. The route is guarded by the invitation token only (no `playerId` required); a bad token returns 403 and an unknown session id returns 404. The link is hidden when there are no votable Proposed Dates. The link label reuses the ticket-02 translation string.

**Blocked by:** 01 (ical builder module)

**Status:** ready-for-agent

- [x] `GET /join/:id/:team/calendar.ics` returns `200` with `text/calendar; charset=utf-8` and `Content-Disposition: attachment; filename="<match>.ics"` when the invitation token matches
- [x] Works with token only — no `playerId` required
- [x] Bad or missing token returns `403`; unknown session id returns `404`; invalid team param rejected like other join routes
- [x] Export link renders on both the Voting poll step and the Confirmed-info step on the initial render
- [x] Link is absent when the Postponement has no votable Proposed Dates
- [x] Handler spec covers headers, token-only access, 403, and 404; e2e happy path downloads the file from the vote page and asserts a VEVENT is present