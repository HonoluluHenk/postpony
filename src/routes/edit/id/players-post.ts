import * as v from 'valibot';
import type { App } from '../../../app';
import { generateId } from '../../../lib/crypto-utils';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import { Player } from '../../../lib/models';

const PlayerSchema = v.object({
  playerName: v.pipe(v.string(), v.minLength(1, 'Player name is required')),
});

export const handleEditPlayersPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    app.notFound('Session not found');
  }

  const values = await app.c.req.parseBody();
  const validation = v.safeParse(PlayerSchema, values);

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);

    if (app.isPartial) {
      const playerName = values['playerName'] as string;
      const error = errors.fields['playerName'];
      const playerList = session.players.map((p: Player) => `
          <li>
            <i>person</i>
            <div class="max">${p.name}</div>
          </li>`)
        .join('');

      return app.c.html(`
        <div id="error-container" hx-swap-oob="true">
          ${errors.global ? `
            <div class="error padding white-text" role="alert">
              <i aria-hidden="true">error</i>
              <div class="max">
                <p>${errors.global}</p>
              </div>
            </div>` : ''}
        </div>
        <section id="team-management" class="padding small-round surface-variant s12 m6">
          <header>
            <h4>${app.t('home_team_players')}</h4>
          </header>
          <ul id="player-list" class="list">
            ${playerList}
          </ul>
          <form hx-post="/edit/${session.id}/players" hx-target="#team-management" class="mt-4">
            <div class="field label border fill ${error ? 'invalid' : ''}">
              <input type="text" id="playerName" name="playerName" value="${playerName}">
              <label for="playerName">${app.t('new_player_name')}</label>
              <span class="error" role="alert">${error ?? ''}</span>
            </div>
            <div class="right-align">
              <button type="submit">${app.t('add_player')}</button>
            </div>
          </form>
        </section>
      `, {status: 400});
    }

    return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
  }

  const {playerName} = validation.output;
  session.players.push({
    id: generateId(),
    name: playerName,
    teamId: 'home-team',
  });

  if (app.isPartial) {
    const playerList = session.players.map((p: Player) => `
        <li>
          <i>person</i>
          <div class="max">${p.name}</div>
        </li>`)
      .join('');
    return app.c.html(`
      <div id="error-container" hx-swap-oob="true"></div>
      <section id="team-management" class="padding small-round surface-variant s12 m6">
        <header>
          <h4>${app.t('home_team_players')}</h4>
        </header>
        <ul id="player-list" class="list">
          ${playerList}
        </ul>
        <form hx-post="/edit/${session.id}/players" hx-target="#team-management" class="mt-4">
          <div class="field label border fill">
            <input type="text" id="playerName" name="playerName" required>
            <label for="playerName">${app.t('new_player_name')}</label>
          </div>
          <div class="right-align">
            <button type="submit">${app.t('add_player')}</button>
          </div>
        </form>
      </section>
    `);
  }
  return app.c.redirect(`/edit/${id}`);
};
