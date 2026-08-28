# 02: Locale helper for time-only input + locale strings

**What to build:** The app can parse a locale-flavoured time-of-day without a date and renders weekday labels + generator copy in `de-CH` and `en-US` without breaking the auto-derived `TranslationKeys` type.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] New helper returns `{ hour, minute } | undefined` from a locale input.
- [ ] 24h locales (`de-CH`, `fr-CH`, `it-CH`) accept `HH:mm`; 12h locale (`en-US`) requires `hh:mm aa` with case-insensitive `am`/`pm`; missing marker is rejected.
- [ ] Out-of-range hour or minute (e.g. `25:00`, `12:99`) rejected; out-of-range 12h (`13:00 pm`) rejected.
- [ ] Seconds allowed but ignored (minute precision).
- [ ] Locale strings added to `en.json` and `de.json`: `proposed_dates_generate_section`, `_help`, `_button`, `_added` (with `count` param), `_none`, `_add_row`, `_remove_row`, `_no_anchor`, and `weekdays_short` (7-entry array).
- [ ] fr-CH / it-CH continue to inherit English strings per ADR-0016; falling back is verified by a focused test if the current machinery doesn't already assert it.
- [ ] Auto-derived `TranslationKeys` type still resolves when the array-valued `weekdays_short` key is present.
- [ ] Unit spec for the helper and a translation-keys snapshot spec are green.

## Comments
