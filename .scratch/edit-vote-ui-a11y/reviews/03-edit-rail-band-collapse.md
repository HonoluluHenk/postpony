# Review: 03-edit-rail-band-collapse

## Standards

No violations.

- `BAND_COLLAPSE_THRESHOLD = 6` lives beside the band domain (`sort-control.tsx`, next to `AvailabilityBand`) instead of being hard-coded in the rail; the threshold/kind logic stays in one place the captain pages can reuse.
- The rail wraps rows once into `rows` and branches plain-vs-disclosure on `sort === 'availability' && group.rows.length > BAND_COLLAPSE_THRESHOLD`, so the disclosure is scoped to the availability sort alone and the week-grouped date view keeps its exact markup.
- The wrap is a native `<details>`/`<summary>` with the `RailGroupHeading` (`<h3 class="week-head">`) reused as the summary content — no new heading element, no duplicated heading markup, tooltip logic untouched.
- `<section>` heading rule holds: the disclosure's `<summary>` still carries the section's `<h3>`, so the region keeps a heading for axe.
- Default state is deterministic: `open={group.key === 'fullStrength'}` — threshold + band kind, never user memory — so a partial HTMX swap always re-renders to the same default.
- Per-row controls (Delete, Votable, Confirm Date) are the identical existing `DateActions` markup; the disclosure only changes the wrapper, so expansion never changes behaviour.
- No locale file changes: the summary reuses `availabilityGroupLabel` (label + count), so no `en.json`/`de.json` churn.
- BeerCSS globals are only overridden where needed (`summary:focus-visible` ring counters its `summary:focus { outline: none }`), in the design layer after the vendor layer. Tokens used (`--line`, `--radius-card`, `--surface-container-lowest`, `--space-*`) all already exist; no design-token edit.
- Reduced motion disables only the chevron transition; rotation state is native (attribute-driven, no JS).
- arc42 gets a matching 8.12 subsection and the README's "last verified" line is bumped.

Judgement calls (no change requested): the collapse leaves groups independent (no `name` grouping on the `<details>`), matching the spec's "each band is its own disclosure"; the chevron duplicates the `details.side-block` affordance pattern rather than sharing a CSS custom property (the two disclosures serve different layouts and a shared token would over-couple them).

## Spec

Ticket criteria 1–5 map to the implementation + render spec:

- Criterion 1 — bands over 6 rows collapse into `<details class="availability-band">` whose summary shows the band label + count; render spec covers 6 rows → plain (`not.toContain('availability-band')`) and 7 rows → closed disclosure with `<span>Not playable (7)</span>`.
- Criterion 2 — `open` renders only on the full-strength band (`<details class="availability-band" open="">`); spec asserts the 7-date voted session opens full-strength and the unvoted session stays closed, locking the deterministic default across re-renders.
- Criterion 3 — spec asserts the tail row of a collapsed band still carries `data-open-dialog` (Delete), the votable-toggle post URL, and the Confirm Date post URL inside the `<details>`.
- Criterion 4 — native `<summary>` gives keyboard open/close for free; the `:focus-visible` ring and the reduced-motion rule are in CSS. Render spec is done here; the keyboard e2e + axe pass on the disclosure is delegated to the coordinator.
- Criterion 5 — spec renders the same 7-date session sorted by date and asserts plain `Week 36` / `Week 37` groups with no `availability-band` anywhere.