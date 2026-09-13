# Review: 04-e2e-click-to-vote

Reviewed diff: `3d60d6f..HEAD` (bbcc7cd) against the ticket + spec in `.scratch/ical-vote-links/`.

## Standards

No documented-standard violations found. The change touches one e2e spec and the working tree is otherwise clean. Tooling (tsc strict for e2e, eslint `--max-warnings 0`) already enforced; `npm run lint` green.

Repo conventions observed:

- Suite extension, not a new spec: both scenarios added to the existing `join-voting.e2e.ts`, reusing `EditPage.createSession`, `JoinPage`, `voteRadio(...)`, and the `page.evaluate` localStorage pattern from the join-flow prior art.
- `test`/`expect` imported from `./fixtures`; `checkA11y()` asserted exactly once per test at the final stable state (poll rendered, all assertions settled).
- Table-driven-free, strongly-typed helper (`choice` is a union literal, not `string`); the `.ics` fixup regex is scoped (`vote-[^&=]+=`), never `.*`-greedy.
- No assertions on serializer internals; the link is extracted from the downloaded `DESCRIPTION` text after RFC 5545 unfold, matching the spec's "external contract" seam.

Judgement calls (no action, recorded only):

- `extractVoteLink` is a module-local helper, not a Page Object method. It parses a calendar body, not a page, so it has no natural home on `JoinPage`; precedent is `assertCalendarDownload` in `ical-export.e2e.ts`. Extracting a shared helper across spec files would be churn for a 6-line function — deferred until a third consumer appears.
- The happy path downloads the file twice (real browser `download` event + `page.request.get`). Deliberate, matching `assertCalendarDownload`'s dual click-and-request: the click proves the Content-Disposition filename reaches the browser; the request yields the body to parse. Not worth collapsing.
- The vote link is opened with `page.goto`, not a synthetic click — that *is* the contract (a calendar app follows the URL), so no separate click wrapper is warranted.

## Spec

Seam 3 (e2e) implemented for all three ticket boxes:

- [x] #happy path — create a Postponement (`createSession`), join as a Participant on the voting poll, download the *personalized* file (export link carries `playerId`; asserted the downloaded file's link embeds both `token` and that same `playerId`), extract the `vote-<dateId>=IfNecessary` link from `DESCRIPTION`, open it, and assert the poll shows the Participant's `IfNecessary` Vote checked (`voteRadio('IfNecessary').toBeChecked()`, `Yes` unchecked, saved-toast visible).
- [x] #error path — fetch the export without a Player identity (unpersonalized file; asserts the extracted `=Yes` link carries no `playerId`), clear the stored identity, open the link, assert the register step renders instead of the poll, then `join('Bob')` and assert the `Yes` Vote lands without re-selecting the choice.
- [x] #attachment — `Content-Type` contains `text/calendar`, `Content-Disposition` matches `/^attachment; filename=".+\.ics"$/`, and the browser `download.suggestedFilename()` ends `.ics`.

Scope: the only behavioural product assertions are the outcome of clicks (checked radios + saved toast). The degraded-file fetch doubles as the ticket-01/03 e2e-level guard (no `playerId=` in an unpersonalized link). No fixture sel actual code outside `join-voting.e2e.ts`; no new spec file; no serializer-internal assertions. No scope creep found.

Gates: `npm run lint` green; `npm run test` all pass (coverage Statements 90.2 % / Branches 82.41 % / Functions 93.39 % / Lines 90.5 %); `npm run e2e` 99/99 passed including the two new scenarios.

Verdict: approve, no fixes required.