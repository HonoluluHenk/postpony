## Context

The generator (`GenerateForm`, `src/routes/edit/id/proposed-dates-section.tsx`) is a server-rendered Monday–Sunday grid. Its `time[]` values survive only inside a POST's `extras.times` echo; a full reload returns an empty grid. The venue select is likewise not echoed on a successful generate. The app already uses per-origin `localStorage` for per-team player identity (`postpony-player-<sessionId>-<team>`, ADR-0013) and for a session-scoped vote-focus hint, so a client-only memory mechanism is consistent with existing patterns. See `proposal.md` — Why for motivation.

## Goals / Non-Goals

**Goals:**

- Remember the organizer team's weekday times + venue on the device, team-scoped (not side-scoped), and prefill the generator on its next render.
- Store locale-independently so the slate renders correctly under any Locale.
- Zero server model/handler change and no new dependency.

**Non-Goals:**

- No per-postponement scoping, no server persistence, no From/To memory (see proposal Non-goals).
- No migration of existing server state (the feature is additive client-side).

## Decisions

### D1 — Storage: team-scoped `localStorage`, canonical value

- Key: `postpony-generator-` + `encodeURIComponent(championship|group|teamtable)`, where the triple is the organizer team's `ClickTtTeamIdentity` (ADR-0022). Deterministic, side-independent, safe as a storage key (no hashing needed).
- Value (JSON, unversioned — parse defensively and ignore on mismatch):

```json
{
    "venue": 1,
    "times": {
        "0": {
            "h": 18,
            "m": 0
        },
        "3": {
            "h": 20,
            "m": 0
        }
    }
}
```

- `times` keyed by the fixed grid row index (`0` = Monday … `6` = Sunday); values are 24h `{h,m}`. `venue` is the selected `venueNumber`, or absent when the default option is chosen.
- The team-scoped key is a deliberate divergence from ADR-0013's per-postponement key. It is documented in the proposal rather than a new ADR because it introduces no new dependency, no security surface, and no server contract — so no ADR is required for this change.

### D2 — Key derivation lives server-side, one derivation point

- A pure helper `generatorMemoryKey(session): string | undefined` returns the key from `session.organizerTeam` and the matching `homeTeamIdentity`/`guestTeamIdentity`, or `undefined` when the identity is absent (defensive; the separately-tracked hardening change would make the fallback unreachable).
- `buildEditPartialsData` (`render-edit-partials.tsx`) adds a `generatorMemoryKey?: string` field, so the initial GET and every partial re-render of `EditPage` carry it — one derivation point, no duplicated branch across handlers.
- `GenerateForm` emits `data-generator-memory-key={props.generatorMemoryKey}` on its `<form>`; when `undefined` the attribute is omitted and the client memory is inert.

### D3 — Locale independence: canonical `{h,m}`, format/parse via the locale time format

- The client derives 12h vs 24h from the current locale's `timeFormat` — `window.AirDatepickerLocale[document.documentElement.lang].timeFormat` (`HH:mm` vs `hh:mm aa`), the same vocabulary the server's `localeConfig` uses (`src/locales/config.ts`).
- Two pure helpers in `ui.js` (JSDoc-typed, unit-tested in the browser project):
    - `toTimeToken(h, m, clock24)` → `18:00` or `6:00 pm`.
    - `parseTimeToken(value, clock24)` → `{h,m}` or `undefined`, mirroring the server grammar in `temporal-utils.ts` (`TIME_24H_PATTERN` / `TIME_12H_PATTERN`, incl. the 12h am/pm normalization). Unparseable entries are dropped from the captured slate.

### D4 — Capture: delegated submit, every submit

A new `initGeneratorMemory()` registers:

1. A delegated `document.addEventListener('submit', …)` scoped to `form[data-generator-memory-key]` — reads every `input[name="time[]"]` in grid order plus `#generateVenueNumber`, canonicalises, and writes the key. It runs synchronously in the same submit event as HTMX's handler, so it captures intent even when the server later rejects validation (the "remember my typing" behavior). A cleared row removes that weekday; an all-empty grid writes a slate with no `times`.
2. A prefill pass (D5) on initial load, plus a delegated `htmx:afterSettle` listener to re-run it.

### D5 — Prefill: empty-only, on load and after every settle

- Prefill reads the key; for each stored weekday index it writes `toTimeToken(h, m)` into the matching `input[name="time[]"]` **only when the input is empty**, so the server's authoritative `extras.times` echo (validation/re-render) always wins — no double-writer race.
- Venue: select the stored `venueNumber` only when it is an `<option>` value in `#generateVenueNumber`; otherwise leave the default (satisfies "Remembered Venue no longer exists").
- Ordering with the pickers is a non-issue: the time-only pickers (`initGeneratorTimePickers`) seed from `startDate` and never read `input.value`, and the date pickers are wired to From/To and `proposedDateTime` — none of which the memory touches. Prefill needs no coordination with picker mount order.

### D6 — No new user-facing strings

- Prefill is invisible (it only fills values the organizer would otherwise type). No `en.json`/`de.json` changes.

## Risks / Trade-offs

- [`localStorage` unavailable (private mode / storage disabled)] → wrap reads/writes in try/catch and no-op, mirroring `rememberVoteFocus` in `ui.js`.
- [Stored `venueNumber` no longer in the session's Venue list (identity-scoped, cross-session drift)] → fall back to the default option; times still prefill (covered by a scenario).
- [Firefox restores form controls on reload (a known app concern, cf. `initSortRadios`)] → low impact: the empty-only guard treats a restored value as non-empty and leaves it alone; the prefill re-runs on load for anything still empty.
- [A user-typed time that fails the locale grammar is silently not remembered] → acceptable and matches the server's own rejection; the row simply won't prefill next time.

## Migration Plan

None — the feature is additive client-side and writes a brand-new `localStorage` key; there is no existing state to migrate and no rollback beyond removing the key.
