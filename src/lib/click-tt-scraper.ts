import { type HTMLElement, parse } from 'node-html-parser';
import config from '../config';
import { ClickTTError } from './errors';
import type { Venue } from './models';

// ponytail: fixture loading is dev/E2E-only and uses `node:fs`. The import is
// dynamic with a non-literal specifier so the Cloudflare Worker bundle never
// pulls in `node:fs` / `node:path` — this branch never runs on the Worker
// (no fixtures dir configured there).

export type ClickTTLanguage = 'English' | 'German' | 'French' | 'Italian';

const BASE_URL = 'https://www.click-tt.ch';
const WA_URL = `${BASE_URL}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa`;

/** Start page that lists every available championship (league). */
const START_URL = `${BASE_URL}/index.htm.de`;
/** League page that lists every group of a championship. */
const LEAGUE_URL = `${WA_URL}/leaguePage?championship={championship}&preferredLanguage={preferredLanguage}`;
/** Plain group page; lists every team (with its `teamPortrait` link) of a group. */
const GROUP_URL = `${WA_URL}/groupPage?championship={championship}&group={group}&preferredLanguage={preferredLanguage}`;
/** Team page; lists the team's matches (complete schedule). */
const TEAM_URL =
  `${WA_URL}/teamPortrait?teamtable={teamtable}&championship={championship}&group={group}&preferredLanguage={preferredLanguage}`;
/** Club page; lists the club's venues ("Spiellokal N" / "Matchlocation N"). */
const CLUB_URL = `${WA_URL}/clubInfoDisplay?club={club}`;

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

export interface PlayerOnTeam {
  name: string;
}

export interface Match {
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
    const teamtable = queryParam(url, 'teamtable');
    if (teamtable === '1732195') {
      return 'team-thun.html';
    }
    return 'team.html';
  }
  if (url.includes('groupPage')) {
    return 'group.html';
  }
  if (url.includes('leaguePage')) {
    return 'groups.html';
  }
  if (url.includes('clubInfoDisplay')) {
    return 'club-venues.html';
  }
  if (url.includes('index.htm')) {
    return 'leagues.html';
  }
  throw new Error(`No fixture for URL: ${url}`);
}

async function fetchHtml(url: string): Promise<HTMLElement> {
  // Offline/E2E mode: serve downloaded HTML fixtures instead of live requests.
  const fixturesDir = config.get('click-tt-fixtures-dir');
  if (fixturesDir) {
    // ponytail: dynamic, non-literal import — keeps node:fs out of the Worker bundle.
    const fsMod = 'node:fs';
    const pathMod = 'node:path';
    const [fsNs, pathNs] = await Promise.all([
      import(fsMod) as Promise<typeof import('node:fs')>,
      import(pathMod) as Promise<typeof import('node:path')>,
    ]);
    const html = fsNs.readFileSync(pathNs.join(fixturesDir, fixtureNameForUrl(url)), 'utf-8');
    return parse(html);
  }
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PostPony/1.0 (game rescheduler)',
      'Accept-Language': 'de,en;q=0.8',
    },
  });
  if (!res.ok) {
    throw new ClickTTError(`click-tt.ch returned ${res.status} ${res.statusText} on url ${url}`);
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
 * Scrapes the matches of a single team from its team page (`teamPortrait`).
 * The page lists the matches across one or more schedule tables (e.g. first
 * and second half of the season); all of them are parsed.
 */
export async function fetchMatches(
  championship: string,
  group: string,
  teamtable: string,
  preferredLanguage: ClickTTLanguage = 'German',
): Promise<Match[]> {
  const root = await fetchHtml(buildUrl(TEAM_URL, {teamtable, championship, group, preferredLanguage}));

  const tables = root.querySelectorAll('table.result-set');
  const matches: Match[] = [];
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
      // Only rows whose second cell is an actual date are match rows; this
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
      matches.push({day, date, time, homeTeam, guestTeam});
    }
  }
  return matches;
}

/**
 * Scrapes the roster (player list) of a single team from its team page
 * (`teamPortrait`). The page lists the players in a ranking table with columns
 * for rank, name, classification, and statistics. Returns an empty array when
 * the page does not include a roster table.
 */
export async function fetchPlayers(
  championship: string,
  group: string,
  teamtable: string,
  preferredLanguage: ClickTTLanguage = 'German',
): Promise<PlayerOnTeam[]> {
  const root = await fetchHtml(buildUrl(TEAM_URL, {teamtable, championship, group, preferredLanguage}));

  const tables = root.querySelectorAll('table.result-set');
  for (const table of tables) {
    const headerCells = table.querySelectorAll('th');
    const hasRankHeader = [...headerCells].some(
      (cell) => /^(Rang|Rank)$/.test(cell.text.trim()),
    );
    if (!hasRankHeader) {
      continue;
    }

    // ponytail: O(n) scan per table — the player table has at most ~30 rows.
    const players: PlayerOnTeam[] = [];
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) {
        continue;
      }
      const rank = (cells[0]?.text ?? '').trim();
      // Skip summary rows (Einzel/Doppel/Total) — they have no rank.
      if (!rank || !/^\d/.test(rank)) {
        continue;
      }
      const name = (cells[1]?.text ?? '').replace(/\u00a0/g, ' ')
        .trim();
      if (!name) {
        continue;
      }
      players.push({name: decode(name)});
    }
    return players;
  }
  return [];
}

/**
 * Extracts the organizer's club ID from a team page (`teamPortrait`): the
 * first `a[href*="clubInfoDisplay"]` link points at the organizer's club.
 * Returns undefined when the page carries no such link.
 */
export function extractClubId(root: HTMLElement): string | undefined {
  const href = root.querySelector('a[href*="clubInfoDisplay"]')?.getAttribute('href');
  if (!href) {
    return undefined;
  }
  return queryParam(href, 'club') ?? undefined;
}

/**
 * Fetches a team page and returns the organizer's club ID, or undefined when
 * the page has no club link. Thin seam over `extractClubId` so callers never
 * touch the raw page HTML.
 */
export async function fetchClubId(
  championship: string,
  group: string,
  teamtable: string,
  preferredLanguage: ClickTTLanguage = 'German',
): Promise<string | undefined> {
  const root = await fetchHtml(
    buildUrl(TEAM_URL, {teamtable, championship, group, preferredLanguage}),
  );
  return extractClubId(root);
}

/**
 * Parses a venue address line like "Dennigkofenweg 169, 3072 Ostermundigen,
 * Schweiz" into address / postalCode / city. A trailing country token
 * (Schweiz/Swiss/Suisse/Svizzera) is dropped.
 */
function parseVenueAddress(line: string): {address: string; postalCode: string; city: string} | null {
  const parts = line.split(',').map((part) => part.trim()).filter((part) => part.length > 0);
  if (parts.length < 2) {
    return null;
  }
  const last = parts[parts.length - 1];
  if (last && /^(?:Schweiz|Swiss|Suisse|Svizzera)$/i.test(last)) {
    parts.pop();
  }
  if (parts.length < 2) {
    return null;
  }
  const address = parts[0];
  const location = parts[parts.length - 1];
  const m = location && /^(\d{4})\s+(.+)$/.exec(location);
  const postalCode = m?.[1];
  const city = m?.[2];
  if (!address || !postalCode || !city) {
    return null;
  }
  return {address, postalCode, city};
}

/**
 * Scrapes the venue list of a club from its club info page (`clubInfoDisplay`).
 * Venue numbers are 1-based and follow the order on the page. Returns an empty
 * array when the page lists no venues.
 */
export async function fetchVenues(clubId: string): Promise<Venue[]> {
  const root = await fetchHtml(buildUrl(CLUB_URL, {club: clubId}));

  const venues: Venue[] = [];
  for (const heading of root.querySelectorAll('h2')) {
    const match = /^(?:Spiellokal|Matchlocation)\s+(\d+)$/i.exec(heading.text.trim());
    if (!match) {
      continue;
    }
    // ponytail: on the live site the venue <h2> sits inside a <p> wrapper, so
    // the venue <p> is the wrapper's next sibling, not the heading's.
    const venueP = heading.nextElementSibling ?? heading.parentNode.nextElementSibling;
    const lines = (venueP?.text ?? '')
      .split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
    const parsed = parseVenueAddress(lines[1] ?? '');
    if (!lines[0] || !parsed) {
      continue;
    }
    venues.push({venueNumber: Number(match[1]), name: lines[0], ...parsed});
  }
  venues.sort((a, b) => a.venueNumber - b.venueNumber);
  return venues;
}
