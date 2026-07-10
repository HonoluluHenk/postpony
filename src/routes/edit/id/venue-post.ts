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

export const handleEditVenuePost = async (app: App): Promise<Response> => {
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
      const error = errors.fields['maxOverlaps'];

      return app.c.html(`
        <div id="error-container" hx-swap-oob="true">
          ${errors.global ? `
            <section class="error padding white-text" role="alert">
              <i>error</i>
              <div class="max">
                <p>${errors.global}</p>
              </div>
            </section>` : ''}
        </div>
        <section id="venue-management" class="padding small-round surface-variant s12 m6">
          <header>
            <h4>${app.t('venue_management')}</h4>
          </header>
          <form hx-post="/edit/${session.id}/venue" hx-target="#venue-management">
            <fieldset>
              <legend class="none">${app.t('venue_management')}</legend>
              <div class="field label border fill ${error ? 'invalid' : ''}">
                <input type="number" id="maxOverlaps" name="maxOverlaps" value="${maxOverlaps}" min="0">
                <label for="maxOverlaps">${app.t('max_overlaps')}</label>
                <span class="error">${error ?? ''}</span>
              </div>
            </fieldset>
            <nav class="right-align">
              <button type="submit">${app.t('update_venue_settings')}</button>
            </nav>
          </form>
        </section>
      `, {status: 400});
    }

    return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
  }

  const {maxOverlaps} = validation.output;

  session.maxOverlaps = maxOverlaps;

  if (app.isPartial) {
    return app.c.html(`
      <div id="error-container" hx-swap-oob="true"></div>
      <section id="venue-management" class="padding small-round surface-variant s12 m6">
        <header>
          <h4>${app.t('venue_management')}</h4>
        </header>
        <form hx-post="/edit/${session.id}/venue" hx-target="#venue-management">
          <fieldset>
            <legend class="none">${app.t('venue_management')}</legend>
            <div class="field label border fill">
              <input type="number" id="maxOverlaps" name="maxOverlaps" value="${session.maxOverlaps ?? ''}" min="0">
              <label for="maxOverlaps">${app.t('max_overlaps')}</label>
            </div>
          </fieldset>
          <nav class="right-align">
            <button type="submit">${app.t('update_venue_settings')}</button>
          </nav>
        </form>
        <aside class="toast success top" role="alert">
          <i>check_circle</i>
          <div class="max">
            <p>${app.t('venue_settings_updated')}</p>
          </div>
        </aside>
      </section>
    `);
  }
  return app.c.redirect(`/edit/${id}`);
};
