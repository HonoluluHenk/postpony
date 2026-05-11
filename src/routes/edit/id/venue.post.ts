import * as v from 'valibot';
import type { App } from '../../../app';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';

const VenueSchema = v.object({
  maxOverlaps: v.union([
    v.pipe(
      v.string(),
      v.transform((val) => (val === '' ? undefined : Number(val))),
      v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
    ),
    v.undefined(),
  ]),
});

export const handleEditVenuePost = async (app: App) => {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    app.notFound('Session not found');
  }

  const values = await app.c.req.parseBody();
  const validation = v.safeParse(VenueSchema, values);

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);

    if (app.isPartial) {
      const maxOverlaps = values['maxOverlaps'] as string;
      const error = errors['maxOverlaps'];

      return app.c.html(`
        <section id="venue-management">
          <h4>Venue Management</h4>
          <form hx-post="/edit/${session.id}/venue" hx-target="#venue-management" hx-swap="outerHTML">
            <div class="form-group">
              <label for="maxOverlaps">Maximum Overlapping Matches (for this session)</label>
              <input type="number" id="maxOverlaps" name="maxOverlaps" value="${maxOverlaps}" min="0"
                     ${error ? 'aria-invalid="true" aria-describedby="maxOverlaps-error"' : ''}>
              ${error ? `<span id="maxOverlaps-error" class="error-message" role="alert">${error}</span>` : ''}
            </div>
            <button type="submit">Update Venue Settings</button>
          </form>
        </section>
      `, {status: 400});
    }

    return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') || ''}`);
  }

  const {maxOverlaps} = validation.output!;

  session.maxOverlaps = maxOverlaps;

  if (app.isPartial) {
    const error = undefined; // No error if we reached here
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
