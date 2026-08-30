# 03: Server-side validation of from/to constraints

**What to build:** The handler validates the submitted `from` and `to` fields against three constraints: `from >= today`, `to > from`, and `to <= originalMatchDateTime + 4 weeks` (or `today + 4 weeks` if no anchor). Validation errors render as field-level messages. The generator is now called with validated `fromIso`/`toIso` — the window is fully driven by user input.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Add Valibot validation for `fromDate` and `toDate` in the tuple submission schema
- [x] Validate `from >= today` (parsed via locale-aware date parsing)
- [x] Validate `to > from`
- [x] Validate `to <= originalMatchDateTime + MAX_FORWARD_WEEKS_FROM_ORIGINAL`
- [x] When no anchor, validate `to <= today + MAX_FORWARD_WEEKS_FROM_ORIGINAL`
- [x] Add `generatorFromError` and `generatorToError` to `GeneratorRenderExtras` and `ProposedDatesSectionProps`
- [x] Render field-level error spans next to `from`/`to` inputs on validation failure
- [x] On validation success, pass validated `fromIso`/`toIso` to `generateProposedDates()`
- [x] On validation failure, return 400 with error messages and echoed values
- [x] Generate button always enabled (no disabled state); errors communicated via field-level messages
