# ADR 0016: Locale-Aware Date Input — Server-Owned Parsing and Formatting

## Status
Accepted. Supersedes ADR-0015.

## Context
The app targets Swiss table tennis clubs across all four national languages, plus users who read dates in the US order. ADR-0015 rendered every date input with a hardcoded `yyyy-MM-dd HH:mm` value regardless of locale — technically unambiguous, but not how any of our users read a date. We want the field to speak the user's locale while persistence stays machine-clean.

## Decision

### Locale strategy

- The locale set becomes `de-CH`, `fr-CH`, `it-CH`, `en-US` (replacing `en`/`de`).
- The header language selector becomes a dropdown of the four locales (replacing the two flag buttons).
- The `AppLocale` type (`'de-CH' | 'fr-CH' | 'it-CH' | 'en-US'`) is used wherever a locale appears. Resolution precedence: explicit choice (via the dropdown, persisted in a cookie) > best-effort parsing of the browser locale (Accept-Language) > default. Browser mapping by language subtag: `de*` → `de-CH`, `fr*` → `fr-CH`, `it*` → `it-CH`, `en*` → `en-US`; everything else (unmatched or missing) → `de-CH`, which is also the default.

### Date input contract

- The input is a plain text field whose placeholder shows the expected format for the resolved locale, plus an explicit button that opens the air-datepicker calendar.
- The picker runs on **all** devices (the coarse-pointer guard from ADR-0015 is removed); it writes the *same token format the server parses* into the field. The field is a carrier; the picker is a convenience.
- The **server owns parsing and formatting**: a tolerant per-locale parser converts the typed string to ISO, and the server formats ISO back to locale tokens for prefill (`originalMatchDateTime`). ISO remains the only persistence and wire format. `DATETIME_LOCAL_PATTERN` and the native `datetime-local` path are removed.

### Format table (server parse grammar == picker tokens)

| Locale | Input format          | Clock |
|--------|-----------------------|-------|
| de-CH  | `dd.MM.yyyy HH:mm`    | 24h   |
| fr-CH  | `dd.MM.yyyy HH:mm`    | 24h   |
| it-CH  | `dd.MM.yyyy HH:mm`    | 24h   |
| en-US  | `MM/dd/yyyy hh:mm aa` | 12h   |

Parse is tolerant: leading zeros optional; `.`, `/`, `-` accepted as date separators; 12h `am`/`pm` case-insensitive. Parsing is always bound to the locale that rendered the field — the server knows it, so the happy path is deterministic.

## Consequences

- **Day/month ambiguity is real and accepted.** The CH locales are day-first, `en-US` month-first, so `02/08/2026` means Feb 8 in CH locales and Aug 2 in en-US. The parse meaning never flips for the session that rendered the field, but copy-pasting a date from a differently-localized session, or switching locale between typing and submit, silently swaps day and month. Mitigation: the placeholder shows the expected form and the picker writes the canonical tokens; no hard guard.
- The server prefill must emit picker tokens (e.g. `dd.MM.yyyy HH:mm`), not `Intl` medium strings — one shared token vocabulary across server parser, server formatter, placeholder, and picker.
- Vendored air-datepicker locale data must cover the four locales (custom entries for de-CH/fr-CH/it-CH if the shipped set lacks them).
- fr-CH and it-CH render English UI text until dedicated translations are added; the wiring is additive so translation files can land later without structural change.
