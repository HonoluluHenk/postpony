# Locale-Aware Dates

Status: ready-for-agent

## Problem Statement

PostPony serves Swiss table tennis clubs across four national languages, but it behaves as if only English and German exist. The date input renders as `2026-08-02 20:00` regardless of locale — technically unambiguous, but not how any user reads a date. A Swiss-German captain types `02.08.2026`, not `2026-08-02`. The language switcher is two flag buttons (EN/DE), so French and Italian players get English or German UI whether they like it or not. And there is no best-effort browser-language detection: a French-speaking visitor landing for the first time is dumped into English until they notice the flags.

The persistence format is not the problem — ISO is correct. The problem is that the *user-facing* date is also ISO.

## Solution

The app speaks four locales — `de-CH`, `fr-CH`, `it-CH`, `en-US` — resolved automatically from the visitor's browser when they have no explicit preference, overridable from a dropdown in the header and remembered across visits. Date inputs show and accept the locale's format, with a visible format hint, a tolerant parser behind the scenes, and a calendar picker available on every device via an explicit button. Storage stays ISO; only the human interface localizes.

## User Stories

1. As a Swiss-German club captain, I want the date input to accept `02.08.2026 20:00`, so that I can type the date the way I read it.
2. As a Swiss-French player, I want the app UI and dates to render in French Swiss (`fr-CH`), so that I can use the app in my language.
3. As a Swiss-Italian player, I want the app UI and dates to render in Italian Swiss (`it-CH`), so that I can use the app in my language.
4. As an English-speaking user, I want the date input to accept `08/02/2026 08:00 pm`, so that I can type dates the way I read them (US order, 12-hour clock).
5. As a German-speaking visitor with no saved preference, I want the app to detect my browser locale and start in `de-CH`, so that I don't have to switch manually.
6. As a French-speaking visitor with no saved preference, I want the app to detect my browser locale and start in `fr-CH`, so that I don't have to switch manually.
7. As an Italian-speaking visitor with no saved preference, I want the app to detect my browser locale and start in `it-CH`, so that I don't have to switch manually.
8. As an English-speaking visitor with no saved preference, I want the app to detect my browser locale and start in `en-US`, so that I don't have to switch manually.
9. As a returning user, I want my language choice to persist across visits, so that I never re-select it.
10. As a user, I want to switch language from a dropdown listing all four locales, so that all options are visible and obvious.
11. As a user who has explicitly chosen a language, I want that choice to override browser detection, so that the app does not flip back on me.
12. As an owner adding a proposed date, I want the field to show the expected format as a hint, so that I know what to type in my locale.
13. As an owner adding a proposed date, I want to type a date without leading zeros (`2.8.2026 8:00`), so that casual input still works.
14. As an owner adding a proposed date, I want `.`, `/`, and `-` all accepted as date separators, so that pasted or sloppy dates still parse.
15. As an owner in `en-US`, I want `8:00 PM` and `8:00 pm` both accepted, so that letter casing never blocks me.
16. As an owner in `en-US`, I want a bare `8:00` with no am/pm suffix rejected as invalid, so that a date can never silently mean the wrong time of day.
17. As an owner, I want an explicit button to open the calendar and time picker, so that I can pick a date without typing.
18. As a mobile owner, I want the calendar picker to work on my phone too, so that touch users get the same picker as desktop.
19. As an owner, I want the picker to open only when I press the button, not when I focus the field, so that the calendar does not pop up over my typing.
20. As an owner editing a scraped match, I want the pre-filled original match date to show in my locale's format, so that I can read and confirm it.
21. As an owner, I want my invalid-date error message localized and my typed text echoed back, so that I can fix it without retyping.
22. As a joiner or voter, I want proposed dates in the vote list and tally views rendered in my locale, so that I understand what I am voting on.
23. As a user with a screen reader, I want the date input's `lang` attribute to match the displayed format, so that dates are pronounced correctly.
24. As an owner, I want dates I entered before this change to render correctly in my locale, so that existing sessions keep working.
25. As a visitor with an unmatchable browser language, I want the app to fall back to the default locale, so that the app always works.
26. As a keyboard user, I want the picker button to be reachable and operable, so that the picker stays accessible.
27. As a maintainer, I want the locale parser and formatter to be pure and unit-testable, so that the behavior is pinned without a browser.

## Implementation Decisions

### Locale model

- The locale set becomes `['de-CH', 'fr-CH', 'it-CH', 'en-US']`, replacing `['en', 'de']`. A new `AppLocale` type (`'de-CH' | 'fr-CH' | 'it-CH' | 'en-US'`) replaces `Locale` and is used wherever a locale applies. `isLocale`, `defaultLocale` (`de-CH`), and the `lang` cookie all migrate to the four codes.
- A single locale-config module owns, per locale: the Intl tag, the input format tokens, the 12/24-hour flag, and the UI label. This is the **one source of truth** for the token vocabulary shared by the server parser, the server formatter, the placeholder, and the picker configuration — a format change is one edit, not five.
- Format table:
  | Locale | Input format | Clock | | --- | --- | --- | | de-CH | `dd.MM.yyyy HH:mm` | 24h | | fr-CH | `dd.MM.yyyy HH:mm` | 24h | | it-CH | `dd.MM.yyyy HH:mm` | 24h | | en-US | `MM/dd/yyyy hh:mm aa` | 12h |
- `toIntlLocale` (the en→en-GB / de→de-DE mapping) is replaced by the per-locale Intl tag from this config.

### Locale resolution (middleware)

- Precedence: explicit choice > browser > default.
    - `?lang=<locale>` → sets the `lang` cookie, redirects without the query param (existing mechanism, new codes).
    - `lang` cookie → wins over browser detection.
    - Otherwise, best-effort parse of the `Accept-Language` header by language subtag: `de*` → `de-CH`, `fr*` → `fr-CH`, `it*` → `it-CH`, `en*` → `en-US`. Everything else — unmatched or missing — falls back to `de-CH` (the default). No client-side `navigator.language` round-trip — the header is sent on every request and keeps resolution server-side.
- The client-side `lang` cookie → localStorage sync behavior preserved (existing `localization.e2e.ts` asserts it).

### Header language selector

- The two flag links become a `<select>` dropdown listing all four locales, labeled with the existing language-selection a11y semantics. Choosing an option navigates to `?lang=<locale>` (with `hx-boost="false"` as today).

### Date input contract

- The input is server-rendered as `type="text"`, with `placeholder` = the expected format for the resolved locale and `lang` bound to the resolved locale (fixing the hardcoded `lang="de"` in the edit template). An adjacent explicit button opens the picker.
- The server owns parsing and formatting. A tolerant per-locale parser converts the typed string to ISO (`YYYY-MM-DDTHH:mm`); the server formats ISO to locale tokens for prefill (`originalMatchDateTime`). ISO remains the only persistence/wire format. `DATETIME_LOCAL_PATTERN` and the native `datetime-local` path are removed; the field is `type="text"` on every device, and the no-JS fallback is hand-typed localized text.
- `air-datepicker` runs on **all** devices (the `(pointer: coarse)` guard is removed). It initializes on the explicit button click (not focus), destroys/recreates on HTMX partial swaps as today, and its `dateFormat`/`timeFormat`/`dateTimeSeparator` come from the shared locale config so the picker writes exactly what the server parses.
- Vendored air-datepicker locale data must cover all four locales; custom entries for the CH locales if the shipped set lacks them.

### Tolerant parser grammar

- Day-first for the CH locales, month-first for `en-US`; the parse meaning is bound to the locale that rendered the field.
- Tolerant: leading zeros optional; `.`, `/`, `-` accepted as date separators; `am`/`pm` matched case-insensitively (with optional surrounding whitespace).
- Unambiguous: the `en-US` time requires the `am`/`pm` suffix — a bare `8:00` is rejected rather than guessed, so 08:00 vs 20:00 never silently flips.
- Unparseable input → the existing localized validation error (`proposed_date_time_invalid`), with the raw typed text echoed back for correction.

### Out-of-the-loop dates

- Vote-list and tally displays switch to the four-locale Intl tags via the shared config. Scraper output keeps storing ISO in `originalMatchDateTime`.

## Testing Decisions

- **What makes a good test here:** external behavior only — what a user can type that parses, what is rejected, what ISO comes out, what text is rendered. No asserting on internal helper signatures.
- **Parser/formatter (unit)** — the pure parse/format functions in the temporal module, covering: each locale's canonical format, tolerance (no leading zeros, all three separators, am/pm casing), en-US bare-time rejection, ISO round-trip, unparseable input. Prior art: `src/lib/temporal-utils.spec.ts`.
- **Locale resolution (unit)** — the language middleware: `?lang` override, cookie precedence, Accept-Language prefix matching to each locale, fallback default. Prior art: the mocked-context handler tests (`src/routes/edit/id/edit-handlers.spec.ts`, `app-handler.spec.ts`).
- **Proposed-date handler (unit)** — the add-proposed-date validation path accepts each locale's tolerant forms and echoes errors. Prior art: `edit-handlers.spec.ts`.
- **Picker (e2e)** — explicit button opens the picker on desktop **and** touch; picked value matches the locale format and submits as ISO. Prior art: `e2e-tests/date-picker.e2e.ts` (rewritten — the native-`datetime-local`-on-touch assertion is inverted).
- **Localization (e2e)** — dropdown switches among all four locales; cookie persistence; browser-locale detection via a context with a matching `Accept-Language` header. Prior art: `e2e-tests/localization.e2e.ts`.
- **Editing flow (e2e)** — type a localized date into the field and see it appear in the proposed-dates list; error echo on invalid input. Prior art: `e2e-tests/reschedule-editing.e2e.ts`.
- Seam count kept minimal: one deep seam (the pure temporal parse/format module) plus the existing handler and e2e seams.

## Out of Scope

- Full French and Italian UI translation content. The locale plumbing (resolution, dropdown, formats, parsing) ships first; `fr-CH`/`it-CH` UI strings fall back to English until translation files are provided. Wiring is additive so files can land later without structural change.
- Client-side `navigator.language` detection — the `Accept-Language` header is sufficient.
- Timezone handling: persistence remains naive wall-clock ISO (matches the domain — match times are local wall-clock).
- Persistence or storage migration — none needed.
- Adding locales beyond the four, or a 24h variant of `en-US`.

## Further Notes

- Supersedes ADR-0015; recorded in ADR-0016.
- **Accepted ambiguity:** the CH locales are day-first, `en-US` month-first, so `02/08/2026` is Feb 8 in CH and Aug 2 in en-US. The parse meaning never flips for the session that rendered the field, but copying a date from a differently-localized session, or switching locale between typing and submit, silently swaps day and month. Mitigated only by the placeholder hint and the picker writing canonical tokens; no hard guard.
- The shared locale-config module is the single source of truth for the token vocabulary — server parser, server formatter, placeholder, and picker must all read from it, never hardcode tokens.
- Existing tests that assert the space-separated `YYYY-MM-DD HH:mm` value form (`date-picker.e2e.ts`, edit-page tests) will need realignment to the localized formats.
