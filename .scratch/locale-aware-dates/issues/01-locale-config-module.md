# 01 — Locale config module

**What to build:** A single configuration module defining the four supported locales (`de-CH`, `fr-CH`, `it-CH`, `en-US`) as an `AppLocale` union type, each with its Intl language tag, date input format tokens, 12/24-hour clock flag, and dropdown UI label. This module is the one source of truth for the date token vocabulary used by the parser, the formatter, the input placeholder, and the picker configuration — a format change is one edit, not five.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `AppLocale` type exists as `'de-CH' | 'fr-CH' | 'it-CH' | 'en-US'` and is exported from the locales module.
- [ ] Per-locale config carries: Intl tag, input format tokens (`dd.MM.yyyy HH:mm` for the three CH locales, `MM/dd/yyyy hh:mm aa` for en-US), the 12/24-hour flag, and the dropdown label.
- [ ] Config is the single source of truth — no format tokens hardcoded outside it.
