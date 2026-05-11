import type { App } from '../../../app';

export const handleEditVenuePost = async (app: App) => {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    app.notFound('Session not found');
  }

  const body = await app.c.req.parseBody();
  const maxOverlaps = body['maxOverlaps'] ? parseInt(body['maxOverlaps'] as string, 10) : undefined;

  session.maxOverlaps = maxOverlaps;

  if (app.isPartial) {
    return app.c.html(`
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
  return app.c.redirect(`/edit/${id}`);
};
