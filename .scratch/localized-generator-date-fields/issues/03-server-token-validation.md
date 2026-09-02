# 03: Server locale-token validation, prefill, and required From/To

**What to build:** The generator's From/To values are handled by the server in the organizer's locale tokens instead of bare ISO. The generator schema validates From/To through the new date-only parser under the rendering locale, so `dd.MM.yyyy`-style (CH) or `MM/dd/yyyy`-style (en-US) submissions parse deterministically. The get-route prefill formats the default window (today for From; today+4w, or the original Match date + 4 weeks when an anchor exists, for To) into locale tokens. An empty From or To is now a validation error surfaced on the offending field with a clear "please enter a date" message, replacing the old silent default; the submit-time fallback to today/window defaults is removed.

**Blocked by:** 01 (date-only locale parse and format grammar)

**Status:** ready-for-agent

- [x] Submitting From/To as locale tokens (day-first for CH, month-first for en-US) parses deterministically under the rendering locale and generates Proposed Dates as before.
- [x] An empty From or To is rejected with the required-message shown on the correct field, and no Proposed Dates are added.
- [x] The get-route prefills From (today) and To (today+4w, or the Match anchor +4w) as locale tokens, not ISO.
- [x] The removed silent default changes no persistence or window semantics when both fields are filled.

## Comments

99dbce4 — `dateOnlyFieldSchema` (required message on empty, locale parse, ISO transform) wired into tuple schema; removed silent today/window defaults; schema-failure + success re-renders echo token values with `generatorFromError`/`generatorToError`; get-route prefill anchor-aware tokens; new key in en/de; handler tests submit en-US tokens + empty From/To cases. Lint + 609 unit/browser tests green.