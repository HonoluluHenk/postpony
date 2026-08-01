# 04 — Locale resolution precedence and header dropdown

**What to build:** The visitor's locale resolves with the precedence: explicit choice (dropdown / `?lang`, persisted in the `lang` cookie) > best-effort browser-locale detection from the `Accept-Language` header > default. Detection maps by language subtag: `de*` → `de-CH`, `fr*` → `fr-CH`, `it*` → `it-CH`, `en*` → `en-US`; everything else, including a missing header, → `de-CH`. The header flag links become a dropdown listing all four locales; choosing one applies and persists it.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] `?lang` / dropdown choice sets the cookie and overrides browser detection.
- [ ] A request with a matching `Accept-Language` header resolves to the mapped locale; unmatched or missing headers fall back to `de-CH`.
- [ ] The dropdown lists all four locales and switches the UI; the choice persists across visits.
- [ ] Localization e2e covers detection, dropdown switching, and persistence.
