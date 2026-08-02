---
name: localization
description: How localization (i18n) works in this project (PostPony). Use whenever you add or change a user-facing string, add a translation key, interpolate a parameter into a message, or need to keep the English and German locale files in sync.
---

# PostPony Localization

Every user-facing string is localized. There are four `AppLocale`s (`'de-CH' | 'fr-CH' | 'it-CH' | 'en-US'`); the default is `de-CH`. German (`de.json`) and English (`en.json`) are the only dedicated files; `fr-CH` and
`it-CH` fall back to the English text until dedicated translations land (ADR-0016). Never hard-code display text in a handler or `.eta` view.

## When to Use This Skill

Use this skill whenever you need to:

- Add a new user-facing string or change an existing one.
- Interpolate a runtime value into a message.
- Understand how `TranslationKeys` is typed, or fix a "key not assignable" error.
- Keep `en.json` and `de.json` in parity.

## How it works

- Strings live in `src/locales/en.json` and `src/locales/de.json` (flat
  `key -> string` maps).
- `src/locales/config.ts` is the **single source of truth** for the four
  `AppLocale`s, their Intl tags, date/time input formats (`dd.MM.yyyy HH:mm`
  vs `MM/dd/yyyy hh:mm aa`), clock style, and dropdown labels. Read formats via
  `inputFormat(locale)` / `localeConfig(locale)` — never hard-code a format.
- `src/locales/constants.ts` derives the key type from English:

  ```ts
  export type TranslationKeys = keyof typeof en;
  ```

  So **adding a key to `en.json` automatically extends `TranslationKeys`** — no manual type edits. Referencing a key not present in `en.json` is a type error.
- `translations` maps `'de-CH' → de.json`, `'en-US' → en.json`, and
  `'fr-CH'` / `'it-CH' → en.json`.
- Resolve strings via `app.t('key')` in handlers and `t('key')` in `.eta`
  templates (the `render` helper injects `t`, `locale`, `languageOptions`,
  `inputFormat`, `isPartial`, `baseUrl`).
- Lookup falls back `translations[locale][key]` → `translations[defaultLocale][key]`
  → raw key. `defaultLocale` is `'de-CH'`, so an untranslated key resolves to German, not English.

## Adding or changing a key

1. Add the key to `src/locales/en.json` (this defines the type).
2. Add the **same** key to `src/locales/de.json` with the German translation.
3. Use it via `app.t('your_key')` / `t('your_key')`.

- Keys are alphabetically ordered — insert new keys in the matching place to keep diffs small.
- A missing `de` key won't fail the build (falls back to German default / raw key), but leaving one untranslated is a bug — always add both.

## Parameters

Messages interpolate runtime values with Eta-style placeholders `<%= it.NAME %>`, substituted by the second argument to `t`:

```json
"missing_param": "Missing required parameter: <%= it.name %>",
"status_label": "Status: <%= it.status %>"
```

```ts
app.t('missing_param', {name: 'id'});     // -> "Missing required parameter: id"
```

- Parameter values are plain strings; pass every placeholder the template uses.
- Use the same placeholder name in both `en.json` and `de.json`.

## Conventions

- `AppLocale = 'de-CH' | 'fr-CH' | 'it-CH' | 'en-US'`; default is `'de-CH'`
  (`defaultLocale` in `constants.ts`).
- The active locale is resolved by `languageMiddleware` from `?lang=` → `lang`
  cookie → `Accept-Language` prefix mapping (`de*`→de-CH, `fr*`→fr-CH,
  `it*`→it-CH, `en*`→en-US), stored on the context under `LOCALE_KEY` and read via `app.locale` (an `AppLocale`, not an Intl tag). Unit-test mocks return
  `'en-US'` (or `'de-CH'`) for it.
- The `?lang=` query on a fresh page also drives `localStorage['lang']`
  (client-side), so the choice survives cookie-clearing.
- Some strings contain inline HTML (e.g. `owner_password_label`); keep markup identical across locales.
