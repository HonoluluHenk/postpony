# Review: 03-app-request-response-seam

Two-axis review of `ea37ae2...HEAD` (commit `a3076c7` "ticket done:
03-app-request-response-seam"), spec source:
`.scratch/architecture-deepening/issues/03-app-request-response-seam.md` and
`.scratch/architecture-deepening/spec.md` (decision 03).

The `code-review` skill asks for two parallel sub-agents, but this environment has no
Task/sub-agent tool, so both axes were reviewed inline. They are still reported
separately.

## Standards

Documented standards (`AGENTS.md`, `CONTEXT.md`, the `route-handlers`, `testing`, and
`tdd` skills) are met:

- **One seam, no raw `Context` in handlers.** `App.c` is `private readonly`;
  `grep -rn "app\.c" src/` returns nothing. `App.create` plus the class's own methods
  are the only consumers of `Context`. `build-app.tsx`'s `onError` still uses the raw
  Hono `c` (it is the wiring/error boundary, not a route handler), which is outside
  this ticket's seam.
- **Strongly typed, not stringly.** `body()` has real overloads: no options →
  `Record<string, string | File>`, `{all: true}` → the repeated-field union;
  `html`/`text` take `ContentfulStatusCode`; `setHeader(name, value)` is `(string,
  string) => void`. No string codes introduced.
- **Deletion over addition.** 254 insertions against 256 deletions across 34 files;
  eight bespoke context fakes collapse into one; no new dependency, no new locale
  string, no user-visible change, no e2e file touched.
- **Behaviour preserved.** Every call site is a mechanical `app.c.req.query` →
  `app.query`, etc. The one semantic move — `currentSort` reading `HX-Current-URL` via
  `app.currentUrl()` — keeps the same fall-back-to-`date` result; the existing
  header/absent/invalid/unknown-sort tests still cover it, and a new test covers the
  `HX-Redirect` HTMX branch. `npm run verify` green (713 unit/browser, 118 e2e).
- **Lazy, no speculative abstraction.** The seam methods are thin, deliberate
  adapters the ticket asked for; `html` accepts only the `{status}` handlers use.
- **Tests.** The shared fake (`src/lib/__test-utils__/create-app.ts`) replaces the
  edit/join/create/ical fakes; the new `src/app-request-response.spec.ts` targets the
  seam. One flaky e2e run was observed (focus-management) and passed on rerun and in
  the final `verify`.

Baseline smells checked: no Mysterious Names, Duplicated Code, Feature Envy, Data
Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change,
Speculative Generality, Message Chains, or Refused Bequest.

Judgement calls (no documented-standard breach):

- **`App` is a partial Middle Man (deliberate).** The new `query`/`header`/`html`/
  `redirect`/`text`/`setHeader` methods are pure delegation. That is the whole point of
  the seam decision — the repo standard (spec decision 03) overrides the baseline.
- **`App.html` narrows Hono's `init` to `{status?}`.** A response header cannot be set
  through `html`; no handler needs that (`setHeader` covers it). YAGNI, but a future
  caller wanting `html(body, {headers})` must extend the signature.
- **The fake's header fidelity is partial.** `setHeader` is merged into `html`/`text`
  responses but not `redirect`, whereas real Hono applies prepared headers to a
  redirect too. No handler combines them today; noted so a future one is not surprised.
- **`app-request-response.spec.ts` partly asserts the fake.** The `html`/`redirect`/
  `text`/`setHeader` tests confirm delegation against the double. `currentUrl`'s
  fallback is the genuinely non-trivial assertion. The spec explicitly asked for the
  App seam to be tested, so accepted.

## Spec

Decision 03 is implemented in full:

- **Methods on `App`.** `query`, `body(options)` (covers `{all: true}`), `header`,
  `currentUrl`; responses `html`, `redirect`, `text`, `setHeader`. `setHeader` is the
  `HX-Redirect` mechanism (`match-post.ts`).
- **`App.c` private; no handler references it.** Confirmed by grep across `src/`.
- **HTMX redirect and HX-Current-URL sort recovery still work.** `currentUrl()` =
  `HX-Current-URL` header with the request URL as fallback; `currentSort` parses it.
  New `match-post.spec.ts` test asserts a partial POST answers `200` with
  `HX-Redirect: /edit/:id?organizerPassword=…` rather than a `302`; the four existing
  `renderEditPartials` sort tests still pass.
- **One shared fake replaces the bespoke fakes.** The eight fakes in
  `match-post.spec.ts`, `scrape-wizard.spec.ts`, `join-handlers.spec.ts`,
  `vote-view.spec.tsx`, `join-ical-get.spec.ts`, `edit-handlers.spec.ts`,
  `run-edit-command.spec.ts`, `ical-get.spec.ts` all now import
  `src/lib/__test-utils__/create-app.ts`; the old edit-local fake is deleted.
- **No user-visible change.** No locale key, route, or dependency added; e2e and
  screenshot baselines unchanged.

Deviations / partials worth recording:

- **`currentUrl()` is `HX-Current-URL ?? request url`, not header-only.** The ticket
  said it recovers the rail sort from `HX-Current-URL`; falling back to the request URL
  is what makes it "the current URL" and is behaviour-equivalent for the sort (a
  mutation URL carries no `sort`). The app-level spec asserts both branches.
- **Ticket criterion "Coverage ≥ 90%" is not met on branches repo-wide (82.78%,
  statements 90.19%, functions 93.56%, lines 90.45%).** The testing skill states the
  enforced gate is 80%, no threshold is configured, and this change adds covered seam
  code plus a test, so it is not a regression — but the ticket's stated 90% on *all*
  metrics is not literally satisfied.
- **`app-handler.spec.ts` and `app-render.spec.tsx` keep their own context fakes.**
  They are App's own specs (testing `requireParam`, locale resolution, `render`), not
  the edit/join/create/ical route specs the ticket names. Left as-is to avoid churn.

## Summary

Standards: 0 hard violations, 4 judgement calls (worst: `App.html` dropping Hono's
header-capable `init`, low impact). Spec: decision 03 implemented in full and all six
acceptance criteria ticked; the only unfulfilled text is the ticket's 90% branch
coverage, which is a pre-existing repo-wide figure against an 80% enforced gate.
