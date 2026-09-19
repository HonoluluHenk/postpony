## 1. Server-side key derivation

- [x] 1.1 Add pure helper `generatorMemoryKey(session)` returning `postpony-generator-<encodeURIComponent(championship|group|teamtable)>` from the organizer side's identity, or `undefined` when it is absent — verify: unit test covers both the present-identity and absent-identity branches.
- [x] 1.2 Thread `generatorMemoryKey?: string` from `buildEditPartialsData` into `GenerateForm` and emit `data-generator-memory-key` on the form, omitted when undefined — verify: `edit-page.spec.tsx`/`proposed-dates-section.spec.tsx` assert the attribute is present with an identity and absent without one, in both the initial GET and a partial re-render.

## 2. Client storage and token helpers

- [x] 2.1 Add pure `toTimeToken(h, m, clock24)` and `parseTimeToken(value, clock24)` in `ui.js`, mirroring the server grammar and 12h am/pm normalization — verify: new `ui.spec.js` browser cases cover 24h and 12h round-trips and reject unparseable input.
- [x] 2.2 Add canonical slate read/write over `localStorage` (unversioned JSON `{venue, times}`, try/catch no-op on unavailable storage) keyed by `data-generator-memory-key` — verify: browser cases cover save/load and a parse-failure/absent-storage no-op.

## 3. Client capture and prefill

- [x] 3.1 Implement `initGeneratorMemory()` with a delegated submit listener (scoped to `form[data-generator-memory-key]`) that canonicalises the `time[]` rows plus venue and saves, including on failed validation — verify: browser cases assert a submit persists the slate and an empty grid clears the times.
- [x] 3.2 Implement the prefill pass (empty-only time rows; venue selected only when the stored number is a valid option) run on initial load and re-run on `htmx:afterSettle` — verify: browser cases assert empty-only fill does not overwrite a server-echoed value and the venue fallback.
- [x] 3.3 Wire `initGeneratorMemory()` into `main.js` and export it from `ui.js` so it runs on load — verify: `npm run lint` clean and browser specs green.

## 4. End-to-end behavior

- [x] 4.1 Extend `e2e-tests/proposed-date-generator.e2e.ts` (and `pages/EditPage.ts` as needed): generate → reload → grid still shows the weekday times and venue; switch `?lang=en-US` and confirm the tokens reformat; a votable-toggle swap keeps the grid populated — verify: `npm run e2e` green for the new cases.

## 5. Release gate

- [x] 5.1 Run `npm run verify` (lint → test → build → e2e) and confirm the full gate is green with coverage intact for the change — verify: `npm run verify` exits 0.
