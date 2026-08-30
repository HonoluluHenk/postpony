# 03: Server-side validation of from/to constraints

**What to build:** The handler validates the submitted `from` and `to` fields against three constraints: `from >= today`, `to > from`, and `to <= originalMatchDateTime + 4 weeks` (or `today + 4 weeks` if no anchor). Validation errors render as field-level messages. The generator is now called with validated `fromIso`/`toIso` — the window is fully driven by user input.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Add Valibot validation for `fromDate` and `toDate` in the tuple submission schema
- [ ] Validate `from >= today` (parsed via locale-aware date parsing)
- [ ] Validate `to > from`
- [ ] Validate `to <= originalMatchDateTime + MAX_FORWARD_WEEKS_FROM_ORIGINAL`
- [ ] When no anchor, validate `to <= today + MAX_FORWARD_WEEKS_FROM_ORIGINAL`
- [ ] Add `generatorFromError` and `generatorToError` to `GeneratorRenderExtras` and `ProposedDatesSectionProps`
- [ ] Render field-level error spans next to `from`/`to` inputs on validation failure
- [ ] On validation success, pass validated `fromIso`/`toIso` to `generateProposedDates()`
- [ ] On validation failure, return 400 with error messages and echoed values
- [ ] Generate button always enabled (no disabled state); errors communicated via field-level messages
