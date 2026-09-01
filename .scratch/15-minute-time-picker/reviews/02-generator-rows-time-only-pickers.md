# Review: 02-generator-rows-time-only-pickers

Review of `151db03` (diff `1536a9f...HEAD`).
Spec source: `.scratch/15-minute-time-picker/spec.md` + `issues/02-generator-rows-time-only-pickers.md`.
Standards sources: repo `AGENTS.md` (lazy senior dev, strongly typed, testing conventions) + smell baseline. No subagent tooling in this session; both axes reviewed inline.

## Standards

- Pass overall. The change replaces the single-instance `activeDatePicker` module var with a generalised lifecycle (`pickerInstances` Map, `pruneDetachedPickers`, `mountPicker`, `resolvePickerLocale`) and mounts eight instances — no server edits, no new dependencies, no new abstractions beyond what the multi-instance requirement forces.
- `mountPicker` is a clean extraction: both init functions share the same try/catch-closeover `build`, registry, and button wiring; the two inits differ only in options. Not duplicated.
- **Judgement call — Middle Man-ish `agent` wrapper:** the picker instance is wrapped in a 3-method `agent` object. It is justified: `onShow` closes over `picker` which is assigned *after* construction, and `destroy()` is called from both the registry prune path and the re-mount path. The indirection is small, named honestly, and keeps stale-capture bugs out. Accept as lazy encapsulation; the upgrade path (an `init`/`destroy` plugin wrapper) is noted by the design comment.
- **Judgement call — negative assertion, revisited:** from 01's review; the generator spec asserts `hoursStep` toBeUndefined (ui.spec.js). Same argument applies (asserts "not overriding" rather than behavior), while the new e2e asserts the rendered `step="1"`. Acceptable; not a blocker.
- `mountPicker` options for row pickers set **both** `timepicker: true` and `onlyTimepicker: true` — added after a headless-browser calibration proved the vendored bundle gates `_addTimepicker()` on `timepicker` alone, so `onlyTimepicker` without it renders no time sliders. The driver comment names the vendor behaviour; the spec's `onlyTimepicker` assertion in ui.spec.js locks it in.
- Button/JSX follows the existing picker-button convention (`class="button"`, icon-only `<i aria-hidden>`), and the `<li>` placement keeps the `<ul>/<ol>`+label structure intact (no `<section>` nesting violation).
- e2e/unit additions reuse existing patterns (recording fake, `createSession`, scoped `.air-datepicker.-active-` locator); `checkA11y` with the picker open mirrors `date-picker.e2e.ts:47`.

## Spec

All 8 acceptance criteria met:

1. **7 trigger buttons, localized accessible name** — one `<button id="time-N-picker">` per row `li`, `aria-label`+`title` via `proposed_dates_generate_time_picker_label` in en.json (`"Open time picker"`) and de.json (`"Uhrzeit-Picker öffnen"`); fr/it fall back to English UI strings (ADR-0016) while the picker's 24h `timeFormat` still matches their `localeConfigs` (`HH:mm`), consistent with the single picker.
2. **Time-only picker, 15-min minute slider / 1-h hour slider** — `timepicker+onlyTimepicker`, `minutesStep: 15`, hoursStep at vendor default; e2e asserts hidden date view + rendered `step="15"` / `step="1"`.
3. **Writes the locale time token matching placeholder** — row placeholder is `localeConfig(locale).timeFormat`; picker writes the resolved locale's token (calibrated: en-US `10:30 am`; de-CH `HH:mm`). Picking wired via vendor-native `_onChangeTime` → selection → `_setInputValue`; no custom onSelect needed.
4. **Plain-text stay / off-grid untouched / no focus-open** — `showEvent: 'adp-never-fire'` + button-only `show()`; e2e asserts focus opens nothing and the typed `19:37` survives open/pick. Headless-browser calibration (off-grid value not selected on mount, `selectDate` parse fails silently) grounds this beyond the vendored-bundle reading.
5. **Coexist + survive swaps** — `pickerInstances` keyed per input, `pruneDetachedPickers` on `!input.isConnected`, re-mount in the `afterSettle` handler; ui.spec simulates a swap (8 → 16 instances, all 8 pre-swap destroyed, fresh buttons bind fresh instances).
6. **Labels + keyboard operable + a11y scan** — slider aria-labels patched per open (`patchTimeSliderLabels(picker)` now takes the instance); e2e `checkA11y` with the picker open passes.
7. **Browser unit recording fake** — new describe asserts `timepicker`+`onlyTimepicker`, `minutesStep 15`, `hoursStep` undefined, `showEvent: 'adp-never-fire'`, per-button `show`, and the swap/rebind count.
8. **E2E covers rows + main-picker non-regression** — two new row-picker tests; `date-picker.e2e.ts` re-run green (single picker unaffected).

No scope creep: no server validation changes, no rounding, no new locale key beyond the button label. Verified full gate in the worktree before commit: lint ✓, 578 unit/browser tests ✓ (coverage 89/81/92/89), 13 e2e ✓.

## Summary

Standards: 2 judgement calls (agent wrapper, hoursStep negative assertion), no violations. Spec: all 8 criteria met, no gaps or creep.