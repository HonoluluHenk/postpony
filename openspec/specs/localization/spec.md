## Purpose

Localization resolves the user-facing language per request — one of de-CH, fr-CH, it-CH, en-US — and drives translations, date/time input grammar, and formatting. fr-CH and it-CH reuse the English UI text (ADR-0016). All user-facing strings live in locale files that must be kept in sync.

## Requirements

### Requirement: Locale set and resolution order

The supported locales SHALL be `de-CH | fr-CH | it-CH | en-US` with default `de-CH`. The locale for a request SHALL be resolved in exactly this order: explicit `?lang=` query parameter, then the `lang` cookie, then the `Accept-Language` header prefix mapping.

#### Scenario: Query parameter wins

- **WHEN** a request carries `?lang=en-US`
- **THEN** the locale is en-US regardless of cookie or header

#### Scenario: Cookie is next

- **WHEN** a request has no `?lang=` parameter but has a `lang` cookie
- **THEN** the cookie value selects the locale

#### Scenario: Header last

- **WHEN** a request has neither a `?lang=` parameter nor a `lang` cookie
- **THEN** the locale is derived from the `Accept-Language` header's prefix

#### Scenario: Invalid query or cookie value ignored

- **WHEN** the `?lang=` parameter or cookie holds a value that is not a supported locale
- **THEN** the value is ignored and resolution falls back to the next source

### Requirement: fr-CH and it-CH reuse English text

fr-CH and it-CH SHALL display the English UI text (ADR-0016); only de-CH and en-US carry distinct translations.

#### Scenario: Italian request shows English

- **WHEN** the resolved locale is it-CH
- **THEN** the user sees the English UI text

### Requirement: Date/time input grammar follows the locale

Date/time input and formatting SHALL follow the locale's grammar for parsing and display, with validation going through a strict ISO string so invalid dates are caught rather than balanced (the "Temporal object form balances invalid dates" pitfall).

#### Scenario: Locale-aware parsing and formatting

- **WHEN** a date/time is entered or displayed
- **THEN** parsing and formatting use the resolved locale's conventions
- **AND** invalid dates are rejected, never silently rebalanced

### Requirement: Translations are centralized and kept in sync

All user-facing strings SHALL come from the locale files (`src/locales/en.json` and `src/locales/de.json`) under translation keys derived from `en.json`; de-CH is the live German locale, other German-speaking variants reuse it. Adding a user-facing string SHALL add the key to both files so they never drift.

#### Scenario: New string added to both locales

- **WHEN** a user-facing string is introduced
- **THEN** the key exists in `en.json` and `de.json`

#### Scenario: Informal address in German

- **WHEN** German instructions or messages are written
- **THEN** they address the user informally ("du"), never formally ("Sie")