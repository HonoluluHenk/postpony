import type { App } from '../../../app';
import { fetchMeetings, fetchPlayers, fetchTeams } from '../../../lib/click-tt-scraper';

export const handleScrapeMeetingsGet = async (app: App): Promise<Response> => {
  const championship = app.c.req.query('championship');
  const group = app.c.req.query('group');
  const teamtable = app.c.req.query('teamtable');
  if (!championship) {
    app.failure(app.t('missing_param', {name: 'championship'}));
  }
  if (!group) {
    app.failure(app.t('missing_param', {name: 'group'}));
  }
  if (!teamtable) {
    app.failure(app.t('missing_param', {name: 'teamtable'}));
  }
  const leagueName = app.c.req.query('leagueName') ?? '';
  const groupName = app.c.req.query('groupName') ?? '';
  const teamName = app.c.req.query('teamName') ?? '';

  const [meetings, players, teams] = await Promise.all([
    fetchMeetings(championship, group, teamtable),
    fetchPlayers(championship, group, teamtable),
    fetchTeams(championship, group),
  ]);

  const teamtableByName: Record<string, string> = {};
  for (const t of teams) {
    teamtableByName[t.name] = t.teamtable;
  }

  const meetingsWithOpponent = meetings.map((m) => {
    const opponentName = m.homeTeam === teamName ? m.guestTeam : m.homeTeam;
    return {...m, opponentTeamtable: teamtableByName[opponentName] ?? ''};
  });

  const html = app.render('create/scrape/meetings.eta', {
    title: app.t('scrape_choose_match'),
    isPartial: app.isPartial,
    meetings: meetingsWithOpponent,
    players,
    leagueName,
    groupName,
    teamName,
    championship,
    group,
    teamtable,
  });
  return app.c.html(html);
};
