import { type HTMLElement, parse } from 'node-html-parser';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type ClickTTLanguage = 'English' | 'German' | 'French' | 'Italian';

const BASE_URL = 'https://www.click-tt.ch';
const WA_URL = `${BASE_URL}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa`;

/** Start page that lists every available championship (league). */
const START_URL = `${BASE_URL}/index.htm.de`;
/** League page that lists every group of a championship. */
const LEAGUE_URL = `${WA_URL}/leaguePage?championship={championship}&preferredLanguage={preferredLanguage}`;
/** Plain group page; lists every team (with its `teamPortrait` link) of a group. */
const GROUP_URL = `${WA_URL}/groupPage?championship={championship}&group={group}&preferredLanguage={preferredLanguage}`;
/** Team page; lists the team's meetings (complete schedule). */
const TEAM_URL =
  `${WA_URL}/teamPortrait?teamtable={teamtable}&championship={championship}&group={group}&preferredLanguage={preferredLanguage}`;

export interface League {
  name: string;
  championship: string;
}

export interface Group {
  name: string;
  championship: string;
  group: string;
}

export interface Team {
  name: string;
  championship: string;
  group: string;
  teamtable: string;
}

export interface Meeting {
  day: string;
  date: string;
  time: string;
  homeTeam: string;
  guestTeam: string;
}

/**
 * Fills `{placeholder}` tokens in a URL template with URL-encoded values.
 */
function buildUrl(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)}/g, (_match, key: string) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing URL parameter: ${key}`);
    }
    return encodeURIComponent(value);
  });
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&nbsp;/g, ' ');
}

function queryParam(href: string, name: string): string | null {
  try {
    return new URL(decode(href), BASE_URL).searchParams.get(name);
  } catch {
    return null;
  }
}

/**
 * Maps a requested click-tt.ch URL to the name of the local HTML fixture that
 * mirrors that page. Mirrors the routing used by the unit-test fixtures so the
 * full scraping flow can run end-to-end without hitting the live site.
 */
function fixtureNameForUrl(url: string): string {
  if (url.includes('teamPortrait')) {
    return 'team.html';
  }
  if (url.includes('groupPage')) {
    return 'group.html';
  }
  if (url.includes('leaguePage')) {
    return 'groups.html';
  }
  if (url.includes('index.htm')) {
    return 'leagues.html';
  }
  throw new Error(`No fixture for URL: ${url}`);
}

async function fetchHtml(url: string): Promise<HTMLElement> {
  // Offline/E2E mode: serve downloaded HTML fixtures instead of live requests.
  const fixturesDir = process.env['CLICK_TT_FIXTURES_DIR'];
  if (fixturesDir) {
    const html = readFileSync(join(fixturesDir, fixtureNameForUrl(url)), 'utf-8');
    return parse(html);
  }
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PostPony/1.0 (game rescheduler)',
      'Accept-Language': 'de,en;q=0.8',
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return parse(await res.text());
}

/**
 * Scrapes the click-tt.ch start page and returns every championship (league)
 * the user can drill down into.
 */
export async function fetchLeagues(): Promise<League[]> {
  const root = await fetchHtml(START_URL);
  const links = root.querySelectorAll('a[href*="leaguePage"]');
  const seen = new Set<string>();
  const leagues: League[] = [];
  for (const link of links) {
    const href = link.getAttribute('href');
    const name = normalizeWhitespace(link.text);
    if (!href || !name) {
      continue;
    }
    const championship = queryParam(href, 'championship');
    if (!championship) {
      continue;
    }
    if (seen.has(championship)) {
      continue;
    }
    seen.add(championship);
    leagues.push({name: decode(name), championship});
  }
  return leagues;
}

/**
 * Scrapes a league page and returns every group (e.g. "HE 2. Liga Gr. 1")
 * of the given championship.
 */
export async function fetchGroups(
  championship: string,
  preferredLanguage: ClickTTLanguage = 'German',
): Promise<Group[]> {
  const root = await fetchHtml(buildUrl(LEAGUE_URL, {championship, preferredLanguage}));
  const links = root.querySelectorAll('a[href*="groupPage"]');
  const seen = new Set<string>();
  const groups: Group[] = [];
  for (const link of links) {
    const href = link.getAttribute('href');
    const name = normalizeWhitespace(link.text);
    if (!href || !name) {
      continue;
    }
    const group = queryParam(href, 'group');
    if (!group) {
      continue;
    }
    // Ignore links that point at sub-views (table, statistics, ...) rather
    // than a plain group; those carry a displayTyp/displayDetail/type param.
    if (queryParam(href, 'displayTyp') || queryParam(href, 'displayDetail') || queryParam(href, 'type')) {
      continue;
    }
    if (seen.has(group)) {
      continue;
    }
    seen.add(group);
    groups.push({name: decode(name), championship, group});
  }
  return groups;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scrapes a plain group page and returns every team of the group together with
 * the `teamtable` id needed to open its team page.
 */
export async function fetchTeams(
  championship: string,
  group: string,
  preferredLanguage: ClickTTLanguage = 'German',
): Promise<Team[]> {
  const root = await fetchHtml(buildUrl(GROUP_URL, {championship, group, preferredLanguage}));
  const links = root.querySelectorAll('a[href*="teamPortrait"]');
  const seen = new Set<string>();
  const teams: Team[] = [];
  for (const link of links) {
    const href = link.getAttribute('href');
    const name = normalizeWhitespace(link.text);
    if (!href || !name) {
      continue;
    }
    const teamtable = queryParam(href, 'teamtable');
    if (!teamtable) {
      continue;
    }
    if (seen.has(teamtable)) {
      continue;
    }
    seen.add(teamtable);
    teams.push({name: decode(name), championship, group, teamtable});
  }
  return teams;
}

/**
 * Scrapes the meetings of a single team from its team page (`teamPortrait`).
 * The page lists the meetings across one or more schedule tables (e.g. first
 * and second half of the season); all of them are parsed.
 */
export async function fetchMeetings(
  championship: string,
  group: string,
  teamtable: string,
  preferredLanguage: ClickTTLanguage = 'German',
): Promise<Meeting[]> {
  const root = await fetchHtml(buildUrl(TEAM_URL, {teamtable, championship, group, preferredLanguage}));

  const tables = root.querySelectorAll('table.result-set');
  const meetings: Meeting[] = [];
  const seen = new Set<string>();
  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 8) {
        continue;
      }
      const day = (cells[0]?.text ?? '').trim();
      const date = (cells[1]?.text ?? '').trim();
      // Only rows whose second cell is an actual date are meeting rows; this
      // skips the club-info and player-ranking tables on the team page.
      if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
        continue;
      }
      const time = (cells[2]?.text ?? '').trim()
        .replace(/\s+/g, ' ');
      // cells[3] = location, cells[4] = round
      const homeTeam = (cells[5]?.text ?? '').replace(/\u00a0/g, ' ')
        .trim();
      const guestTeam = (cells[7]?.text ?? '').replace(/\u00a0/g, ' ')
        .trim();
      if (!homeTeam || !guestTeam) {
        continue;
      }
      const key = `${date}|${time}|${homeTeam}|${guestTeam}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      meetings.push({day, date, time, homeTeam, guestTeam});
    }
  }
  return meetings;
}
