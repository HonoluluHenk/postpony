import type { App } from '../../app';
import type { Postponement } from '../../lib/models';
import { formatIsoToLocaleTokens } from '../../lib/temporal-utils';
import { requireChangeSession } from './change-utils';
import { CreatePage, type CreateFormValues } from './create';

interface ChangeModeData {
  changeMode: true;
  sessionId: string;
  ownerPassword: string;
  session: Postponement;
  values: CreateFormValues;
}

export async function handleCreateGet(app: App): Promise<Response> {
  const sessionId = app.c.req.query('sessionId');
  const ownerPassword = app.c.req.query('ownerPassword');
  const changeMode = !!sessionId;

  const data: ChangeModeData | undefined = changeMode
    ? await (async () => {
      const session = await requireChangeSession(app, sessionId, ownerPassword);
      if (!sessionId || !ownerPassword) {
        // Unreachable: requireChangeSession throws when either is missing.
        app.failure(app.t('invalid_owner_password'), 403);
      }
      return {
        changeMode: true,
        sessionId,
        ownerPassword,
        session,
        values: {
          homeTeam: session.homeTeam ?? '',
          guestTeam: session.guestTeam ?? '',
          originalMatchDateTime: session.originalMatchDateTime
            ? formatIsoToLocaleTokens(session.originalMatchDateTime, app.locale)
            : '',
        },
      };
    })()
    : undefined;

  const html = app.render(
    <CreatePage
      {...app.view}
      changeMode={data?.changeMode}
      sessionId={data?.sessionId}
      ownerPassword={data?.ownerPassword}
      values={data?.values}
    />,
  );
  return app.c.html(html);
}
