import * as v from 'valibot';
import type { App } from '../../../app';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import { Reschedule } from '../../../lib/reschedule';

const PlayerSchema = v.object({
  playerName: v.pipe(v.string(), v.minLength(1, 'Player name is required')),
  teamId: v.optional(v.picklist(['home', 'away']), 'home'),
});

export const handleEditPlayersPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = app.sessions[id];
  if (!session) {
    app.notFound('Session not found');
  }

  const values = await app.c.req.parseBody({all: true});
  const validation = v.safeParse(PlayerSchema, values);

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);

    if (app.isPartial) {
      return app.c.html(app.render('edit/id/team-section.eta', {
        sessionId: session.id,
        players: session.players,
        playerName: (values['playerName'] as string | undefined) ?? '',
        teamId: (values['teamId'] as string | undefined) ?? 'home',
        error: errors.fields['playerName'],
        globalError: errors.global,
      }), {status: 400});
    }

    return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
  }

  const {playerName, teamId} = validation.output;
  const updated = new Reschedule().addPlayer(session, playerName, teamId).session;
  app.sessions[id] = updated;

  if (app.isPartial) {
    return app.c.html(app.render('edit/id/team-section.eta', {
      sessionId: updated.id,
      players: updated.players,
    }));
  }
  return app.c.redirect(`/edit/${id}`);
};
