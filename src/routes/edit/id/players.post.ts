import * as v from 'valibot';
import type { App } from '../../../app';
import { generateId } from '../../../lib/crypto-utils';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import { Player } from '../../../lib/models';

const PlayerSchema = v.object({
  playerName: v.pipe(v.string(), v.minLength(1, 'Player name is required')),
});

export const handleEditPlayersPost = async (app: App) => {
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
      const error = errors['playerName'];
      const playerList = session.players.map((p: Player) => `<li>${p.name}</li>`)
        .join('');

      return app.c.html(`
        <section id="team-management">
          <h4>Home Team Players</h4>
          <ul id="player-list">
            ${playerList}
          </ul>
          <form hx-post="/edit/${session.id}/players" hx-target="#team-management" hx-swap="outerHTML">
            <div class="form-group">
              <label for="playerName">New Player Name</label>
              <input type="text" id="playerName" name="playerName" value="${playerName}"
                     ${error ? 'aria-invalid="true" aria-describedby="playerName-error"' : ''}>
              ${error ? `<span id="playerName-error" class="error-message" role="alert">${error}</span>` : ''}
            </div>
            <button type="submit">Add Player</button>
          </form>
        </section>
      `, {status: 400});
    }

    return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') || ''}`);
  }

  const {playerName} = validation.output!;
  session.players.push({
    id: generateId(),
    name: playerName,
    teamId: 'home-team',
  });

  if (app.isPartial) {
    const playerList = session.players.map((p: Player) => `<li>${p.name}</li>`)
      .join('');
    return app.c.html(`
      <section id="team-management">
        <h4>Home Team Players</h4>
        <ul id="player-list">
          ${playerList}
        </ul>
        <form hx-post="/edit/${session.id}/players" hx-target="#team-management" hx-swap="outerHTML">
          <div class="form-group">
            <label for="playerName">New Player Name</label>
            <input type="text" id="playerName" name="playerName" required>
          </div>
          <button type="submit">Add Player</button>
        </form>
      </section>
    `);
  }
  return app.c.redirect(`/edit/${id}`);
};
