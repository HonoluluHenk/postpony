import { type HTMLElement, parse } from 'node-html-parser';

export type ClickTTLanguage = 'English' | 'German' | 'French' | 'Italian';

const BASE_URL = 'https://www.click-tt.ch';
const WA_URL = `${BASE_URL}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa`;

const REGIONS_URL = `${WA_URL}/clubSearch?federation=STT&preferredLanguage={preferredLanguage}`;
const CLUBS_URL = `${WA_URL}/clubSearch?searchPattern={searchPattern}&federation=STT&regionName={regionName}&federations=STT&preferredLanguage={preferredLanguage}`;
const TEAMS_URL = `${WA_URL}/clubTeams?club={club}&preferredLanguage={preferredLanguage}`;
const MEETINGS_URL =
  `${WA_URL}/groupPage?championship={championship}&group={group}&displayTyp=gesamt&displayDetail=meetings&preferredLanguage={preferredLanguage}`;

export interface Region {
  name: string;
  searchPattern: string;
  regionName: string;
}

export interface Club {
  name: string;
  id: string;
}

export interface Team {
  name: string;
  leagueName: string;
  championship: string;
  group: string;
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

async function fetchHtml(url: string): Promise<HTMLElement> {
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

export async function fetchRegions(preferredLanguage: ClickTTLanguage = 'German'): Promise<Region[]> {
  const root = await fetchHtml(buildUrl(REGIONS_URL, {preferredLanguage}));
  const links = root.querySelectorAll('a[href*="regionName="]');
  const seen = new Set<string>();
  const regions: Region[] = [];
  for (const link of links) {
    const href = link.getAttribute('href');
    const name = link.text.trim();
    if (!href || !name) {
      continue;
    }
    const searchPattern = queryParam(href, 'searchPattern');
    const regionName = queryParam(href, 'regionName');
    if (!searchPattern || !regionName) {
      continue;
    }
    if (seen.has(searchPattern)) {
      continue;
    }
    seen.add(searchPattern);
    regions.push({name: decode(name), searchPattern, regionName});
  }
  return regions;
}

export async function fetchClubs(
  searchPattern: string,
  regionName: string,
  preferredLanguage: ClickTTLanguage = 'German',
): Promise<Club[]> {
  const root = await fetchHtml(buildUrl(CLUBS_URL, {searchPattern, regionName, preferredLanguage}));
  const links = root.querySelectorAll('a[href*="clubInfoDisplay?club="]');
  const seen = new Set<string>();
  const clubs: Club[] = [];
  for (const link of links) {
    const href = link.getAttribute('href');
    const name = link.text.trim();
    if (!href || !name) {
      continue;
    }
    const id = queryParam(href, 'club');
    if (!id) {
      continue;
    }
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    clubs.push({name: decode(name), id});
  }
  return clubs;
}

export async function fetchTeams(clubId: string, preferredLanguage: ClickTTLanguage = 'German'): Promise<Team[]> {
  const root = await fetchHtml(buildUrl(TEAMS_URL, {club: clubId, preferredLanguage}));
  const tables = root.querySelectorAll('table.result-set');
  const teams: Team[] = [];
  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) {
        continue;
      }
      const leagueLink = cells[1]?.querySelector('a[href*="groupPage"]');
      if (!leagueLink) {
        continue;
      }
      const teamName = cells[0]?.text.trim() ?? '';
      const leagueName = leagueLink.text.trim();
      const href = leagueLink.getAttribute('href');
      if (!teamName || !leagueName || !href) {
        continue;
      }
      const championship = queryParam(href, 'championship');
      const group = queryParam(href, 'group');
      if (!championship || !group) {
        continue;
      }
      teams.push({
        name: decode(teamName),
        leagueName: decode(leagueName),
        championship,
        group,
      });
    }
  }
  return teams;
}

export async function fetchMeetings(
  championship: string,
  group: string,
  preferredLanguage: ClickTTLanguage = 'German',
): Promise<Meeting[]> {
  const root = await fetchHtml(buildUrl(MEETINGS_URL, {championship, group, preferredLanguage}));
  const table = root.querySelector('table.result-set');
  if (!table) {
    return [];
  }
  const rows = table.querySelectorAll('tr');
  const meetings: Meeting[] = [];
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 8) {
      continue;
    }
    const day = (cells[0]?.text ?? '').trim();
    const date = (cells[1]?.text ?? '').trim();
    const time = (cells[2]?.text ?? '').trim()
      .replace(/\s+/g, ' ');
    // cells[3] = location, cells[4] = round
    const homeTeam = (cells[5]?.text ?? '').trim();
    const guestTeam = (cells[7]?.text ?? '').trim();
    if (!date || !homeTeam || !guestTeam) {
      continue;
    }
    meetings.push({day, date, time, homeTeam, guestTeam});
  }
  return meetings;
}
