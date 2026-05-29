import { type HTMLElement, parse } from 'node-html-parser';

const BASE_URL = 'https://www.click-tt.ch';
const REGIONS_URL = `${BASE_URL}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/clubSearch?federation=STT&preferredLanguage=German`;

export interface Region {
  name: string;
  url: string;
}

export interface Club {
  name: string;
  url: string;
}

export interface Team {
  name: string;
  leagueName: string;
  leagueUrl: string;
}

export interface Meeting {
  day: string;
  date: string;
  time: string;
  homeTeam: string;
  guestTeam: string;
}

function absoluteUrl(href: string): string {
  if (href.startsWith('http')) {
    return href;
  }
  return `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
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

export async function fetchRegions(): Promise<Region[]> {
  const root = await fetchHtml(REGIONS_URL);
  const links = root.querySelectorAll('a[href*="regionName="]');
  const seen = new Set<string>();
  const regions: Region[] = [];
  for (const link of links) {
    const href = link.getAttribute('href');
    const name = link.text.trim();
    if (!href || !name) {
      continue;
    }
    const url = absoluteUrl(decode(href));
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    regions.push({name: decode(name), url});
  }
  return regions;
}

export async function fetchClubs(regionUrl: string): Promise<Club[]> {
  const root = await fetchHtml(regionUrl);
  const links = root.querySelectorAll('a[href*="clubInfoDisplay?club="]');
  const seen = new Set<string>();
  const clubs: Club[] = [];
  for (const link of links) {
    const href = link.getAttribute('href');
    const name = link.text.trim();
    if (!href || !name) {
      continue;
    }
    const url = absoluteUrl(decode(href));
    if (seen.has(url)) {
      continue;
    }
    seen.add(url);
    clubs.push({name: decode(name), url});
  }
  return clubs;
}

/**
 * Derives the clubTeams URL from a clubInfoDisplay URL by extracting the club id.
 */
export function clubTeamsUrlFromClubUrl(clubUrl: string): string {
  const match = /club=(\d+)/.exec(clubUrl);
  if (!match) {
    throw new Error(`Could not extract club id from URL: ${clubUrl}`);
  }
  return `${BASE_URL}/cgi-bin/WebObjects/nuLigaTTCH.woa/wa/clubTeams?club=${match[1]}`;
}

export async function fetchTeams(clubUrl: string): Promise<Team[]> {
  const teamsUrl = clubTeamsUrlFromClubUrl(clubUrl);
  const root = await fetchHtml(teamsUrl);
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
      teams.push({
        name: decode(teamName),
        leagueName: decode(leagueName),
        leagueUrl: absoluteUrl(decode(href)),
      });
    }
  }
  return teams;
}

/**
 * Adds `displayTyp=gesamt&displayDetail=meetings` to a groupPage URL.
 */
export function meetingsUrlFromLeagueUrl(leagueUrl: string): string {
  const u = new URL(leagueUrl);
  u.searchParams.set('displayTyp', 'gesamt');
  u.searchParams.set('displayDetail', 'meetings');
  return u.toString();
}

export async function fetchMeetings(leagueUrl: string): Promise<Meeting[]> {
  const url = meetingsUrlFromLeagueUrl(leagueUrl);
  const root = await fetchHtml(url);
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
