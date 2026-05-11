import { Context } from 'hono';
import { sessions } from '../../../lib/session-store';

export const handleEditVenuePost = async (c: Context) => {
  const id = c.req.param('id');
  if (!id) {
    return c.text('ID is required', 400);
  }
  const session = sessions[id];
  if (!session) {
    return c.text('Session not found', 404);
  }

  const body = await c.req.parseBody();
  const maxOverlaps = body['maxOverlaps'] ? parseInt(body['maxOverlaps'] as string, 10) : undefined;

  session.maxOverlaps = maxOverlaps;

  const isPartial = !!c.req.header('HX-Request');
  if (isPartial) {
    return c.html(`
      <section id="venue-management">
        <h4>Venue Management</h4>
        <form hx-post="/edit/${session.id}/venue" hx-target="#venue-management" hx-swap="outerHTML">
          <div class="form-group">
            <label for="maxOverlaps">Maximum Overlapping Matches (for this session)</label>
            <input type="number" id="maxOverlaps" name="maxOverlaps" value="${session.maxOverlaps || ''}" min="0">
          </div>
          <button type="submit">Update Venue Settings</button>
        </form>
        <p class="success">Venue settings updated!</p>
      </section>
    `);
  }
  return c.redirect(`/edit/${id}`);
};
