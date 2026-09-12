# 01: iCal builder module

**What to build:** A pure `src/lib` module that turns a Postponement into an RFC 5545 `text/calendar` string. It emits one `VEVENT` per currently votable Proposed Date (`rules.votableDates`, ascending): the date matching `confirmedProposedDateId` is `STATUS:CONFIRMED`, all others `STATUS:TENTATIVE`. Each event carries `DTSTART`/`DTEND` as `Europe/Zurich` wall-clock with `DTEND = DTSTART + CLASH_BUFFER_HOURS`, a `LOCATION` from the referenced Venue (venue 1 when `venueNumber` is absent), a `SUMMARY` of `Verschiebung: <match name> (<home> vs <guest>)`, and a `DESCRIPTION` with the original Match date (locale-formatted) and a link back to the Postponement built from `baseUrl`. `UID` is stable per Proposed Date (host-independent), `DTSTAMP` is set, and the file is serialized with CRLF line endings, RFC-5545 text escaping, and 75-octet line folding. Not wired to any route yet.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `buildIcal(session, {baseUrl, locale})` returns a complete `VCALENDAR` (VERSION 2.0, PRODID, CALSCALE, METHOD, X-WR-CALNAME)
- [ ] One VEVENT per votable date, ascending; non-votable dates excluded
- [ ] Confirmed date `STATUS:CONFIRMED`, others `STATUS:TENTATIVE`; after a reopen the formerly-confirmed date is `TENTATIVE`
- [ ] `DTSTART;TZID=Europe/Zurich` equals the date's wall-clock start; `DTEND` = start + `CLASH_BUFFER_HOURS`
- [ ] `LOCATION` resolves the venue via `venueNumber` and falls back to venue 1 when absent
- [ ] `SUMMARY` reads `Verschiebung: <match> (<home> vs <guest>)`; `DESCRIPTION` contains the original date and the baseUrl link
- [ ] UID identical across two builds of the same session
- [ ] CRLF line endings; special characters escaped; lines folded at 75 octets
- [ ] Unit specs cover every bullet above (node Vitest, fixture builders from `__test-utils__`)