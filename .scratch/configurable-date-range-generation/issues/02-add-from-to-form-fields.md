# 02: Add from/to form fields to the generator UI

**What to build:** Add two new date inputs (`from` and `to`) above the weekday grid in the Generate form. When no anchor exists, the fields pre-fill with server-computed defaults (`today` and `today + 4 weeks`). Submitted values are echoed back on validation failure. The handler reads the new form fields but the window is still computed from the anchor (passthrough to ticket 03).

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Add `fromDate` and `toDate` fields to the `GenerateFormProps` interface
- [x] Add two date inputs to the `GenerateForm` component in `proposed-dates-section.tsx`, placed above the weekday grid
- [x] Pre-fill `value` attributes with defaults when no `originalMatchDateTime` exists (`from = today`, `to = today + 4 weeks`)
- [x] Echo back submitted values on form re-render (like the existing `times[]` pattern)
- [x] Add `fromDate`/`toDate` to the form POST payload in the handler
- [x] Update `EditPartialsData` / partial render extras to include `fromDate`/`toDate` values
- [x] Form submits and renders unchanged; window still computed from anchor (no validation yet)

## Comments

5d7c1e6 - Add from/to date inputs to generator UI with echo-back and passthrough handling.
