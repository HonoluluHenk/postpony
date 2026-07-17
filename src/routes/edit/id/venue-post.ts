import * as v from 'valibot';
import type { App } from '../../../app';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import { Reschedule } from '../../../lib/reschedule';

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
      return app.c.html(app.render('edit/id/venue-section.eta', {
        sessionId: session.id,
        maxOverlaps: (values['maxOverlaps'] as string | undefined) ?? '',
        error: errors.fields['maxOverlaps'],
        globalError: errors.global,
      }), {status: 400});
    }

    return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
  }

  const {maxOverlaps} = validation.output;

  const updated = new Reschedule().setVenueLimit(session, maxOverlaps);
  app.sessions[id] = updated;

  if (app.isPartial) {
    return app.c.html(app.render('edit/id/venue-section.eta', {
      sessionId: updated.id,
      maxOverlaps: updated.maxOverlaps ?? '',
      success: true,
    }));
  }
  return app.c.redirect(`/edit/${id}`);
};
