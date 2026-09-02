# 01: Date-only locale parse and format grammar

**What to build:** The app gains a date-only locale token vocabulary so From/To values can be read and written the way each organizer reads dates. A new `parseLocaleDateOnly` accepts a locale date-token string (e.g. `dd.MM.yyyy` day-first for the CH locales, `MM/dd/yyyy` month-first for en-US), tolerantly accepts `.` `/` `-` separators, rejects impossible dates (e.g. `2026-02-30`) via a strict ISO round-trip, and returns undefined instead of throwing — symmetric with the existing time-only parser. A matching date-only formatter renders an ISO date into the locale's date tokens. Both are covered by unit tests across all four locales.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A reviewer can unit-test `parseLocaleDateOnly` across all four locales: day-first vs month-first ordering, tolerant separators, impossible-date rejection, and empty input, without throwing.
- [x] A date-only formatter renders an ISO date into each locale's date tokens, round-tripping correctly.
- [x] The new grammar follows the existing tolerant, strict-round-trip strategy of the current time-only/datetime parsers.