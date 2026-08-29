# 01: Fixed weekday grid + time-only submit

**What to build:** The generator on the edit page becomes a fixed Monday–Sunday grid: exactly 7 rows, each a static weekday label plus an empty time input, with no add-row / remove-row controls and no way to change the weekday. The organizer fills the times they want, clicks Generate, and only rows with a filled time produce Proposed Dates. The submission carries times only — the server maps each submitted time to its row's weekday — empty rows are skipped, a non-empty but invalid time fails that row inline while the other rows are preserved, and submitting with nothing filled shows a message and writes nothing. The organizer's submitted times survive both the success toast re-render and the error re-render. The block stays hidden once the Postponement is Confirmed. The free-form row machinery (add/remove actions, row count state, weekday select per row) is removed, as are the now-unused locale keys, and the helper text is reworded to describe fill-to-generate.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Generator block renders exactly 7 rows, Monday through Sunday, each with the locale's short weekday label as static text and an empty time input; no add/remove controls exist in the rendered HTML.
- [x] Time inputs accept the locale grammar (`HH:mm` for 24h locales, `hh:mm aa` for en-US); placeholder and `lang` match the single-date field.
- [x] Generate submits a tuple-branch body carrying `time[]` only; server pairs `time[i]` with weekday `i+1` and never trusts a client-supplied weekday.
- [x] Empty-time rows are skipped at the parse boundary and never reach the generator.
- [x] A non-empty, unparseable time fails that row only: the offending input is marked `aria-invalid`, an inline error renders under it, and the other rows' values are preserved.
- [x] Submitting with every row empty shows the "no dates added" message and performs no DB write.
- [x] On success, the localized count toast renders and the submitted times remain in the form for re-submission; generation stays idempotent against already-proposed dates.
- [x] Grow/remove branch, row-count state, and weekday select per row are deleted from the tuple handler and the form; `add_row` / `remove_row` locale keys removed from both locale files and the translations spec; helper text reworded.
- [x] Component browser spec asserts the 7-row grid, static labels, empty inputs, absence of add/remove controls, and Confirmed-state absence; handler unit spec covers time-only parsing, empty-skip, per-row error with preservation, all-empty no-write, server-side cap, and the rogue mixed POST rejection; single-date cases stay green.
- [x] The pure generator module and its spec are untouched and stay green.
