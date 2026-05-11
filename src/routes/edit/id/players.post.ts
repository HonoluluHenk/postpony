import type { App } from '../../../app';
import { generateId } from '../../../lib/crypto-utils';
import { Player } from '../../../lib/models';

export const handleEditPlayersPost = async (app: App) => {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    return app.c.text('Session not found', 404);
  }

  const body = await app.c.req.parseBody();
  const playerName = body['playerName'] as string;

  if (playerName) {
    session.players.push({
      id: generateId(),
      name: playerName,
      teamId: 'home-team',
    });
  }

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
