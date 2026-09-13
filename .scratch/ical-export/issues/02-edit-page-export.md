# 02: Export from the edit page

**What to build:** From the Proposed Dates section of the organizer's edit page, a link downloads the calendar file for the Postponement as `<match>.ics` (`text/calendar` with `Content-Disposition: attachment`), using the builder from ticket 01. The link is hidden while there are no votable Proposed Dates (e.g. a Draft Postponement). The route is read-only and requires no password, matching the edit page's public-read model; unknown session id returns 404. The link label uses a translated string (en/de in sync).

**Blocked by:** 01 (ical builder module)

**Status:** ready-for-agent

- [x] `GET /edit/:id/calendar.ics` returns `200` with `text/calendar; charset=utf-8` and `Content-Disposition: attachment; filename="<match>.ics"` (filename sanitized)
- [x] Response body is the ticket-01 calendar (votable dates only, ascending)
- [x] Unknown session id returns `404`
- [x] "Export as calendar (.ics)" link renders in the Proposed Dates section on the initial edit-page render and survives HTMX swaps
- [x] Link is absent when the Postponement has no votable Proposed Dates
- [x] Link label translation key added and kept in sync across en.json/de.json
- [x] Handler spec covers headers, 404, and no-password access; e2e happy path downloads the file from the edit page and asserts a VEVENT is present