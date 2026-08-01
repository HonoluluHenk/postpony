# 02 — Migrate locale set to the four AppLocales

**What to build:** The entire application moves from `en`/`de` to the four `AppLocale` codes: translation dictionaries, locale resolution inputs (`?lang`, cookie), `<html lang>`, element `lang` attributes, handler and template locale plumbing, and tests. de-CH reuses the existing German UI text, en-US the existing English; fr-CH and it-CH fall back to English text until dedicated translations are added. The app compiles and renders under any of the four codes.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `isLocale`, translation lookup, and cookie handling accept and persist all four `AppLocale` codes.
- [ ] de-CH renders the current German UI; en-US the current English UI; fr-CH and it-CH render the English fallback.
- [ ] `<html lang>` and any element `lang` attributes emit the resolved `AppLocale` code.
- [ ] No `'en'`/`'de'` string literals or `en-GB`/`de-DE` mappings remain; the `AppLocale` type is used wherever a locale applies.
- [ ] Full lint and test suite green.
