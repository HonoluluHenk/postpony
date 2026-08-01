# 05 — Locale-aware proposed-date input

**What to build:** The "Add Proposed Date" field becomes a plain text input whose placeholder shows the resolved locale's expected format and whose `lang` attribute matches the locale. An explicit button next to the field opens the calendar and time picker — on desktop and touch — and the picker writes exactly the token format the server parses. The server parses the typed value with the tolerant parser for the resolved locale, validates, stores ISO, and on failure echoes the typed text with a localized message.

**Blocked by:** 02, 03

**Status:** ready-for-agent

- [ ] The field is a text input with a locale-correct format hint and matching `lang`; no native `datetime-local` remains.
- [ ] The picker opens only via the explicit button and works on both touch and desktop.
- [ ] Typing or picking a date in the locale's format submits and persists as ISO.
- [ ] Invalid or ambiguous input (e.g. a bare 12-hour time) shows the localized error and preserves the typed text.
- [ ] The picker re-initialises correctly after HTMX partial swaps.
