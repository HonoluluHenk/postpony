---
name: update-test-fixtures
description: Refresh the click-tt.ch HTML test fixtures (PostPony) and realign the tests that depend on them. Use when the scraper fixtures in src/lib/__fixtures__ have gone stale (e.g. a new season), when re-anchoring on a different club/league/team, or when click-tt-scraper.spec.ts / scraping-flow.e2e.ts assertions no longer match the live site.
---

# Update Test Fixtures (click-tt.ch)

The scraper (`src/lib/click-tt-scraper.ts`) is exercised offline against four downloaded HTML pages in `src/lib/__fixtures__/`. Both the unit spec and the e2e flow assert **concrete** values (counts, names, ids, individual meeting rows), so refreshing a fixture always means updating its tests in lockstep. This skill is the repeatable "command" for that whole process.

## When to Use This Skill

Use this skill whenever you need to:

- Refresh the fixtures from the current live site (a new season rolled over).
- Re-anchor the fixtures on a different club / league / group / team.
- Fix `click-tt-scraper.spec.ts` or `scraping-flow.e2e.ts` assertions that drifted away from the fixture HTML.

## The Four Fixtures

Each fixture mirrors one live page. The scraper picks the file by URL in
`fixtureNameForUrl` (and the unit spec mirrors it in `fixtureForUrl`), so the **file names are fixed** — only their contents change:

| Fixture        | Mirrors          | Live URL (endpoint)                   | Scraper function |
|----------------|------------------|---------------------------------------|------------------|
| `leagues.html` | Start page       | `index.htm.de`                        | `fetchLeagues`   |
| `groups.html`  | League page      | `wa/leaguePage?championship=…`        | `fetchGroups`    |
| `group.html`   | Plain group page | `wa/groupPage?championship=…&group=…` | `fetchTeams`     |
| `team.html`    | Team page        | `wa/teamPortrait?teamtable=…&group=…` | `fetchMeetings`  |

Also look for new fixtures in `src/lib/__fixtures__`. Ask the user if they should also be updated. If so, document them in this skill.

Keep the chain internally consistent: the `championship` from `leagues.html`
must exist in `groups.html`, the `group` from `groups.html` must exist in
`group.html`, and the `teamtable` from `group.html` must exist in `team.html`.

## Step 0 — Ask which league and team (required)

Before downloading anything, **ask the user which league + team to anchor on**
(unless the issue already names one). Then enumerate the club's teams to find the concrete `championship`, `group`, and `teamtable` ids:

```bash
BASE=https://www.click-tt.ch
WA=$BASE/cgi-bin/WebObjects/nuLigaTTCH.woa/wa
UA='PostPony/1.0 (game rescheduler)'   # same UA the scraper sends

# Enumerate a club's teams (club id comes from a clubInfoDisplay?club= link on
# any of that club's team pages). Rows carry the group id + team name.
curl -sS -A "$UA" -H 'Accept-Language: en,de;q=0.8' \
  "$WA/clubTeams?club=<CLUB_ID>&preferredLanguage=English" -o /tmp/clubteams.html

# List the teams of the chosen group to read the teamtable id:
curl -sS -A "$UA" -H 'Accept-Language: de,en;q=0.8' \
  "$WA/groupPage?championship=<CHAMP>&group=<GROUP>&preferredLanguage=German" \
  -o /tmp/group.html
# then grep:  teamPortrait?teamtable=(\d+)…>NAME</a>
```

## Step 1 — Download the four fixtures

Use the app's real `User-Agent`. Download `leagues`/`groups`/`group` in **German** and `team` in **English** (the unit spec expects English day names like `Sat.`/`Mon.`). Substitute `<CHAMP>` (e.g. `MTTV 26/27`), `<GROUP>`, and
`<TEAMTABLE>`:

```bash
DIR=src/lib/__fixtures__

curl -sS -A "$UA" -H 'Accept-Language: de,en;q=0.8' \
  "$BASE/index.htm.de" -o "$DIR/leagues.html"

curl -sS -A "$UA" -H 'Accept-Language: de,en;q=0.8' \
  "$WA/leaguePage?championship=<CHAMP>&preferredLanguage=German" -o "$DIR/groups.html"

curl -sS -A "$UA" -H 'Accept-Language: de,en;q=0.8' \
  "$WA/groupPage?championship=<CHAMP>&group=<GROUP>&preferredLanguage=German" -o "$DIR/group.html"

curl -sS -A "$UA" -H 'Accept-Language: en,de;q=0.8' \
  "$WA/teamPortrait?teamtable=<TEAMTABLE>&championship=<CHAMP>&group=<GROUP>&preferredLanguage=English" \
  -o "$DIR/team.html"
```

Spaces in `<CHAMP>` are fine as `+` or literal spaces; `curl` and the scraper's
`buildUrl` both URL-encode them.

## Step 2 — Derive the exact expected values

Never hand-count the HTML. Run the **real scraper** over the new fixtures with a throwaway dump spec, copy the numbers/rows it prints, then delete the spec:

```ts
// src/lib/click-tt-dump.spec.ts  (TEMPORARY — delete after use)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';
import { fetchGroups, fetchLeagues, fetchMeetings, fetchTeams } from './click-tt-scraper';

describe('dump', () => {
    const DIR = join(__dirname, '__fixtures__');
    const forUrl = (u: string) =>
        readFileSync(join(DIR,
            u.includes('teamPortrait') ? 'team.html'
                                       : u.includes('groupPage') ? 'group.html'
                                                                 : u.includes('leaguePage') ? 'groups.html' : 'leagues.html'), 'utf-8');
    beforeEach(() => vi.stubGlobal('fetch', vi.fn((i: string | URL) =>
        Promise.resolve({
            ok: true, status: 200, statusText: 'OK',
            text: () => Promise.resolve(forUrl(i.toString()))
        } as Response))));
    afterEach(() => vi.unstubAllGlobals());

    test('dump', async () => {
        // eslint-disable-next-line no-console
        console.log('DUMP', JSON.stringify({
            leagues: await fetchLeagues(),
            groups: await fetchGroups('<CHAMP>'),
            teams: await fetchTeams('<CHAMP>', '<GROUP>'),
            meetings: await fetchMeetings('<CHAMP>', '<GROUP>', '<TEAMTABLE>'),
        }, null, 2));
    });
});
```

```bash
npx vitest run src/lib/click-tt-dump.spec.ts 2>&1 | sed -n '/DUMP/,/^}/p'
rm -f src/lib/click-tt-dump.spec.ts   # always remove the throwaway spec
```

## Step 3 — Update the two dependent tests

Using the dumped values, update the concrete assertions:

- `src/lib/click-tt-scraper.spec.ts` — the league/group/team/meeting counts, the spot-checked names + `championship`/`group`/`teamtable` ids, and the example meeting rows in `fetchMeetings`.
- `e2e-tests/scraping-flow.e2e.ts` — the league name to click, the group name, the `listitem` counts (leagues, groups, teams), the full team-name list, the
  `row` count (header + meetings), the concrete meeting rows, and the defaulted **Proposed Date & Time** value (from the first meeting via
  `parseClickTtDateTime`).

## Step 4 — Verify (do not skip)

```bash
npm run lint                                      # tsc source + e2e + eslint
npx vitest run src/lib/click-tt-scraper.spec.ts   # unit spec
npx playwright test e2e-tests/scraping-flow.e2e.ts  # includes the axe a11y check
```

All three must pass. The e2e server is started by Playwright with
`APP_CLICK_TT_FIXTURES_DIR=./src/lib/__fixtures__` (see `playwright.config.ts`), so the flow runs entirely offline against the fixtures you just refreshed.

## Conventions and Gotchas

- Confirm `team.html` is English (`lang="en"`, day names `Sat.`/`Mon.`); otherwise the day-name assertions break.
- The proposed-date default comes only from meetings whose `date`/`time` parse (`dd.mm.yyyy` + `HH:mm`); a time of `00:00` becomes `…T00:00`.
- For running/tests commands see the `npm-scripts` skill; for the beer.css / heading selector traps in the e2e file see the `testing` skill.
