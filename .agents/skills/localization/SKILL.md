---
name: localization
description: How localization (i18n) works in this project (PostPony). Use whenever you add or change a user-facing string, add a translation key, interpolate a parameter into a message, or need to keep the English and German locale files in sync.
---

# PostPony Localization

Every user-facing string is localized. English (`en`) is the source of truth and
the default locale; German (`de`) mirrors it. Never hard-code display text in a
handler or `.eta` view.

## When to Use This Skill

Use this skill whenever you need to:

- Add a new user-facing string or change an existing one.
- Interpolate a runtime value into a message.
- Understand how `TranslationKeys` is typed, or fix a "key not assignable" error.
- Keep `en.json` and `de.json` in parity.

## How it works

- Strings live in `src/locales/en.json` and `src/locales/de.json` (flat
  `key -> string` maps).
- `src/locales/constants.ts` derives the key type from English:

  ```ts
  export type TranslationKeys = keyof typeof en;
  ```

  So **adding a key to `en.json` automatically extends `TranslationKeys`** — no
  manual type edits. Referencing a key not present in `en.json` is a type error.
- Resolve strings via `app.t('key')` in handlers and `t('key')` in `.eta`
  templates (the `render` helper injects `t`, `locale`, `isPartial`, `baseUrl`).
- Lookup falls back English → key: if a `de` value is missing, the English
  value is used; if that is also missing, the raw key string is returned.

## Adding or changing a key

1. Add the key to `src/locales/en.json` (this defines the type).
2. Add the **same** key to `src/locales/de.json` with the German translation.
3. Use it via `app.t('your_key')` / `t('your_key')`.

- Keys are alphabetically ordered — insert new keys in the matching
  place to keep diffs small.
- A missing `de` key won't fail the build (English fallback), but leaving one
  untranslated is a bug — always add both.

## Parameters

Messages interpolate runtime values with Eta-style placeholders `<%= it.NAME %>`,
substituted by the second argument to `t`:

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

- Locales are `'en' | 'de'`; default and source of truth is `'en'`
  (`defaultLocale` in `constants.ts`).
- The active locale is set by `languageMiddleware` and read from the context via
  `LOCALE_KEY`; unit-test mocks return `'en'` for it.
- Some strings contain inline HTML (e.g. `owner_password_label`); keep markup
  identical across locales.
