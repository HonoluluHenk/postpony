# 01: Export constant + rename generator input/output types

**What to build:** Refactor the proposed date generator module to accept explicit `fromIso`/`toIso` instead of computing a window from `anchorIso` ± hardcoded offsets. The 4-week forward cap is extracted as an exported public constant. All existing tests are updated to the new interface and pass. No behavioral change — the handler still derives the window from the anchor and passes it as `from`/`to`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] Export `MAX_FORWARD_WEEKS_FROM_ORIGINAL = 4` from `proposed-dates-generator.ts`
- [x] Remove `BACKWARD_WEEKS` constant
- [x] Update `GenerateProposedDatesInput`: remove `anchorIso`, add `fromIso: string` and `toIso: string`
- [x] Remove `usedFallbackWindow` from `GenerateProposedDatesResult`
- [x] Update `generateProposedDates()` to use `[fromIso, toIso]` directly as the window (internally `lower = max(today, fromIso)`, `upper = toIso`)
- [x] Update all tests in `proposed-dates-generator.spec.ts` to use `fromIso`/`toIso` instead of `anchorIso`
- [x] Update `handleTupleSubmit` in `proposed-dates-post.ts` to derive `fromIso`/`toIso` from the existing anchor logic and pass them to the generator (no new form fields yet)
- [x] Remove `usedFallbackWindow` references from handler and UI
- [x] All existing tests pass with the new interface
