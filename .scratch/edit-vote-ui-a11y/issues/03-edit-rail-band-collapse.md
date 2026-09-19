# 03: Edit rail: long availability bands collapse behind a disclosure

**What to build:** when the organizer sorts by availability and a band holds many dates (the fixture's "Not playable (24)" is the real example), the band renders as a native disclosure so the full-strength and if-necessary dates come first instead of a wall of repeated zero tallies. The heading keeps the band label and count, the top (full-strength) band renders open by default, and an HTMX swap resets every band to the same default so a partial re-render can never strand a collapsed/expanded mismatch. Controls that live inside a collapsed band (Delete, Votable, Confirm Date) stay reachable in place once expanded.

**Blocked by:** 02 — Edit rail: vote dots readable without sight

**Status:** ready-for-agent

- [x] A band whose row count exceeds the threshold (6) renders its rows inside a native disclosure whose summary shows the band label + count; bands at or under the threshold render as today. — `BAND_COLLAPSE_THRESHOLD = 6` lives in `sort-control.tsx`; `ProposedDatesRail` wraps any band with `rows.length > threshold` (availability sort) in `<details class="availability-band">` whose `<summary>` contains the `RailGroupHeading` (label + count). Render spec covers 6 rows → plain and 7 rows → closed disclosure.
- [x] The full-strength band renders open by default; a request-fragment swap resets all bands to the same default. — `open={group.key === 'fullStrength'}`; the default is deterministic (threshold + band kind, never user memory), so every re-render lands on the same state and can never strand a collapse mismatch. Render spec asserts `<details class="availability-band" open="">` only on the full-strength band, closed otherwise.
- [x] After expanding a band, its Delete / Votable / Confirm Date controls work in place, without leaving the band. — Bands re-render the identical per-row markup (Delete opener, votable toggle, Confirm Date) inside the disclosure; render spec asserts all three controls sit inside the `<details>` even for the last row of a collapsed band.
- [x] The disclosure opens/closes with the keyboard, has a visible focus state, and honours reduced motion; render spec + keyboard e2e + axe pass. — Native `<summary>` is keyboard-operable; BeerCSS's `summary:focus { outline: none }` is countered with an explicit `:focus-visible` ring; the chevron's transition is disabled under `prefers-reduced-motion`. Render spec done here; the keyboard e2e + axe pass on the expanded/collapsed band is delegated to the coordinator.
- [x] Sorting by Date still renders the week-grouped list unchanged (no collapse), so the collapse is scoped to the availability sort alone. — The collapse is gated on `sort === 'availability'`; render spec confirms a 7-date session sorted by date renders plain week groups (Week 36/Week 37) with no `availability-band` disclosure.
## Comments

- `193387f` ticket done: 03-edit-rail-band-collapse
- `19e87ac` review: 03-edit-rail-band-collapse

Summary: under the availability sort, a band with more than `BAND_COLLAPSE_THRESHOLD`
(6) rows now renders inside a native `<details class="availability-band">` whose
`<summary>` is the existing band `RailGroupHeading` (label + count), so "Not
playable (24)"-style walls collapse to their heading. Only the full-strength band
opens by default; the default is deterministic (threshold + band kind, never user
memory), so a partial HTMX swap always re-renders the same open/closed state and
can never strand a mismatch. Bands at or under the threshold and the week-grouped
date sort render exactly as before. The per-row Delete / Votable / Confirm Date
controls keep their markup verbatim inside the disclosure. CSS gives the summary a
`focus-visible` ring (BeerCSS removes the outline) and a rotating chevron that loses
its transition under `prefers-reduced-motion`. Five new render tests + the existing
suite pass; `npm run lint` and `npm run test` (99.4% statements) green. arc42 gains
§ 8.12.

Open item for the coordinator: criterion 4's e2e half — a keyboard e2e (Tab to the
`<summary>`, Enter/Space toggles open↔closed, and after expanding a band the
Delete / Votable / Confirm Date controls act in place) plus an axe pass on the
expanded rail. The 24-date fixture check-tt session ("Not playable (24)") and a new
full-strength-heavy session (7+ dates, all firm Yes) exercise both default states;
the `.availability-band` disclosure and the `.week-head` summary are the anchors
(line-level details in the review file).
