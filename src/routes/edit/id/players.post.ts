import { Context } from 'hono';
import { generateId } from '../../../lib/crypto-utils';
import { Player } from '../../../lib/models';
import { sessions } from '../../../lib/session-store';

export const handleEditPlayersPost = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) {
    return c.text('ID is required', 400);
  }
  const session = sessions[id];
  if (!session) {
    return c.text('Session not found', 404);
  }

  const body = await c.req.parseBody();
  const playerName = body['playerName'] as string;

  if (playerName) {
    session.players.push({
      id: generateId(),
      name: playerName,
      teamId: 'home-team',
    });
  }

  const isPartial = !!c.req.header('HX-Request');
  if (isPartial) {
    const playerList = session.players.map((p: Player) => `<li>${p.name}</li>`)
      .join('');
    return c.html(`
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
  return c.redirect(`/edit/${id}`);
};
