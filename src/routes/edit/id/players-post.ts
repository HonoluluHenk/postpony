import * as v from 'valibot';
import type { App } from '../../../app';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import type { Team } from '../../../lib/models';
import { renderEditPartials } from './render-edit-partials';
import { runEditCommand } from './run-edit-command';

const PlayerSchema = v.object({
  playerName: v.pipe(v.string(), v.minLength(1, 'Player name is required')),
  teamId: v.optional(v.picklist(['home', 'away']), 'home'),
});

export const handleEditPlayersPost = (app: App): Promise<Response> => {
  const id = app.requireParam('id');

  return runEditCommand(app, {
    apply: async (rules, session) => {
      const values = await app.c.req.parseBody({all: true});
      const validation = v.safeParse(PlayerSchema, values);

      if (!validation.success) {
        const errors = mapValidationToErrors(validation);

        if (app.isPartial) {
          return app.c.html(renderEditPartials(app, session, {
            playerName: (values['playerName'] as string | undefined) ?? '',
            teamId: (values['teamId'] as Team | undefined) ?? 'home',
            playerError: errors.fields['playerName'],
            globalError: errors.global,
          }), {status: 400});
        }

        return app.c.redirect(`/edit/${id}?organizerPassword=${app.c.req.query('organizerPassword') ?? ''}`);
      }

      const {playerName, teamId} = validation.output;
      return rules.addPlayer(session, playerName, teamId).session;
    },
    message: app.t('player_added'),
    redirectTo: `/edit/${id}`,
  });
};
