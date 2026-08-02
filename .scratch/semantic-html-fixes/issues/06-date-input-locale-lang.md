# 06 — Locale-consistent date-input language attribute

**What to build:** The proposed-date input's `lang` attribute reflects the active locale instead of being hardcoded to German, so dates are pronounced consistently with the rest of the UI. If the locale-aware-dates feature has already landed and made the attribute locale-driven, the only change is dropping the hardcoded value.

**Blocked by:** Reconcile with the locale-aware-dates tickets (`.scratch/locale-aware-dates/`) before editing, to avoid a merge conflict. Not blocked by any other ticket in this set.

**Status:** ready-for-agent

- [ ] No hardcoded `lang` on the proposed-date input.
- [ ] The input's `lang` matches the active locale, or is absent where the locale-aware-dates feature owns it.
- [ ] No functional change to date entry or persistence.
