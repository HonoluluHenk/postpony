import type { App } from '../../../app';
import { fetchMatches, fetchPlayers, fetchTeams } from '../../../lib/click-tt-scraper';
import { ScrapeMatchesPage } from './matches';

export const handleScrapeMatchesGet = async (app: App): Promise<Response> => {
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

  const [matches, players, teams] = await Promise.all([
    fetchMatches(championship, group, teamtable),
    fetchPlayers(championship, group, teamtable),
    fetchTeams(championship, group),
  ]);

  const teamtableByName: Record<string, string> = {};
  for (const t of teams) {
    teamtableByName[t.name] = t.teamtable;
  }

  const matchesWithOpponent = matches.map((m) => {
    const opponentName = m.homeTeam === teamName ? m.guestTeam : m.homeTeam;
    return {...m, opponentTeamtable: teamtableByName[opponentName] ?? ''};
  });

  const html = app.render(
    <ScrapeMatchesPage
      {...app.view}
      matches={matchesWithOpponent}
      players={players}
      leagueName={leagueName}
      groupName={groupName}
      teamName={teamName}
      teamtable={teamtable}
      championship={championship}
      group={group}
    />,
  );
  return app.c.html(html);
};
