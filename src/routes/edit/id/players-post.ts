import * as v from 'valibot';
import type { App } from '../../../app';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import type { Team } from '../../../lib/models';
import { PostponementRules } from '../../../lib/postponement';
import { renderTeamSection } from './team-section';

const PlayerSchema = v.object({
  playerName: v.pipe(v.string(), v.minLength(1, 'Player name is required')),
  teamId: v.optional(v.picklist(['home', 'away']), 'home'),
});

export const handleEditPlayersPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound('Session not found');
  }

  const values = await app.c.req.parseBody({all: true});
  const validation = v.safeParse(PlayerSchema, values);

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);

    if (app.isPartial) {
      return app.c.html(renderTeamSection(app, session, {
        playerName: (values['playerName'] as string | undefined) ?? '',
        teamId: (values['teamId'] as Team | undefined) ?? 'home',
        error: errors.fields['playerName'],
        globalError: errors.global,
      }), {status: 400});
    }

    return app.c.redirect(`/edit/${id}?organizerPassword=${app.c.req.query('organizerPassword') ?? ''}`);
  }

  const {playerName, teamId} = validation.output;
  const updated = new PostponementRules().addPlayer(session, playerName, teamId).session;
  await app.store.save(updated);

  if (app.isPartial) {
    return app.c.html(renderTeamSection(app, updated));
  }
  return app.c.redirect(`/edit/${id}`);
};
