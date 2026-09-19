# Review: 07-vote-page-nojs-submit

Fixed point: `daf1ba1` (parent of the ticket). Reviewed commit: `9c5c52e` (`ticket done: 07-vote-page-nojs-submit`).

## Standards

No violations. `npm run lint` (tsc source + e2e tsconfig + eslint) and `npm run test` (1132 tests, coverage gates incl. `src/routes/join` 98.34% branches, `vote.tsx` 96.15%) are green.

- The only product-code change is the `<noscript>`-wrapped submit control in `VoteRegion` (`src/routes/join/vote.tsx`). It renders only in a scriptless browser, so under JS the control does not exist and cannot double-fire with the htmx auto-save — the structural guarantee the ticket names. The ponytail comment states the mechanism and its race-free ceiling; no handler/domain/JS change was needed because the form already carries `method="post"`/`action` and `handleJoinVotePost` reads the raw body via `app.body()`.
- The button must be the last child described by the form's `aria-label`; its accessible name comes from its own "Save votes"/"Stimmen speichern" text, so the label change is user-facing and locality-typed (`vote_save`, inserted alphabetically into `en.json`/`de.json`, `en` defines the key type). German uses the informal infinitive, matching the screenreader-visible button style (e.g. "Spieler hinzufügen").
- The `.vote-save-actions` rule sits in the vote section of `@layer design`, uses the `--space-4` token, and carries a comment tied to the `<noscript>` render path. No duplicate declarations.
- New specs follow the repo idioms: the render spec anchors the no-JS control via `body.lastIndexOf('</form>')` so the header language `<form>` cannot false-match, and the handler specs exercise the no-JS full-page POST (`<!DOCTYPE html>` + `#vote-region` + toast) through the existing `createApp` util. The malformed-value spec documents the pre-existing whitelist cast instead of re-implementing it.
- Formatter pass: an initial IntelliJ reformat collapsed the pre-existing `.map()` closing-tag indentation in `vote.tsx` (a `))}` at column 1, with no precedent anywhere in `src/routes/`); that churn was reverted so the committed file changes only the lines this ticket owns.

Judgement calls (no change requested):

- `.vote-save-actions { margin-block-start: var(--space-4) }` is technically optional (beer `.button` gets no top margin from surrounding flow). It gives the no-JS control the same breathing room the page uses elsewhere and is two lines; kept.
- The `volatile` div wrapper vs a bare button: the wrapper is what lets the fallback device be spaced without nudging beer's `.button` rules; it is not a real abstraction.

## Spec

Ticket criteria 1–4 map to the implementation + specs:

- Criterion 1 — a scriptless page posts the raw radio form: the render spec asserts the control is `<button type="submit">Save votes</button>` inside a `<noscript>` within the `vote-region` form whose `method="post"`/`action` carry `playerId`/`token`; the handler spec then proves such a POST (no `HX-Request`) persists the vote and renders the saved view. Criterion 4's scripts-disabled e2e exercises this same seam end-to-end and is coordinator-delegated (see below).
- Criterion 2 — auto-save-on-change is untouched (`ui.js`, `main.js` unchanged) and the fallback physically cannot fire a second request: under JS the `<noscript>` subtree is never rendered, so there is no submit device to race `requestSubmit()`. The two-process guarantee is structural, not timing-based.
- Criterion 3 — the confirmation is the existing saved-toast (`class="toast success top" role="status"`, i.e. implicit aria-live). The handler spec asserts both `role="status"` and "Your votes have been saved!" on the no-JS full-page path; the HTMX path keeps its pre-existing rendering, so the announcement is identical on both.

### Delegated to coordinator (scripts-disabled e2e, criterion 4)

Out of this ticket's file lane by instruction; render/handler seams above are the agent-side evidence. What the e2e should verify, by user-visible behavior:

- **Happy path** — a script-disabled context (e.g. Playwright `javaScriptEnabled: false` at navigation) opens the vote URL with `playerId` + `token`, selects a radio, presses "Save votes"/"Stimmen speichern"; the native POST persists the vote (reload and assert the radio stays checked) and shows the "Your votes have been saved!" status toast.
- **Likely error paths** — a malformed submission shows the existing error treatment: missing/bad `token` → 400 error page (alert "Invalid or missing invitation token"); unknown `playerId` → 302 to the `/join/:id/:team?token=...` register step ("Join the Postponement" heading).

### Not verified here

The real-server axe pass and the JS-enabled vote flow (`join-voting.e2e.ts` / `JoinPage`) — both coordinator gates, unchanged by this ticket.