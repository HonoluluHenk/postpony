import * as v from 'valibot';
import type { App } from '../../app';
import { mapValidationToErrors } from '../../lib/map-validation-to-errors';
import { opponentPasswordFromRequest, opponentTeam } from './opponent-utils';
import { renderOpponent } from './render-opponent';
import { runOpponentCommand } from './run-opponent-command';

const PlayerSchema = v.object({
  playerName: v.pipe(v.string(), v.minLength(1, 'Player name is required')),
});

export const handleOpponentPlayersPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const values = await app.body({all: true});
  const playerId = (values['playerId'] as string | undefined)?.trim() ?? '';
  const removing = playerId !== '';

  return runOpponentCommand(app, {
    apply: (rules, session) => {
      if (removing) {
        // Defense-in-depth: only a player on the opponent team may be removed.
        const target = session.players.find((p) => p.id === playerId);
        if (target?.teamId !== opponentTeam(session)) {
          return session;
        }
        return rules.removePlayer(session, playerId);
      }

      const validation = v.safeParse(PlayerSchema, values);
      if (!validation.success) {
        const errors = mapValidationToErrors(validation);
        if (app.isPartial) {
          return app.html(renderOpponent(app, session, {
            playerName: (values['playerName'] as string | undefined) ?? '',
            playerError: errors.fields['playerName'],
            globalError: errors.global,
          }), {status: 400});
        }
        return app.redirect(`/opponent/${id}?opponentCaptainPassword=${opponentPasswordFromRequest(app)}`);
      }

      return rules.addPlayer(session, validation.output.playerName, opponentTeam(session)).session;
    },
    message: removing ? app.t('player_removed') : app.t('player_added'),
  });
};
