import * as v from 'valibot';
import type { App } from '../../app';
import { generateId, generateRandomPassword, hashPassword } from '../../lib/crypto-utils';
import { mapValidationToErrors } from '../../lib/map-validation-to-errors';
import { DEFAULT_CLUB_ID, type Postponement } from '../../lib/models';

export async function handleCreatePost(app: App): Promise<Response> {
  const CreateSchema = v.object({
    name: v.pipe(v.string(), v.minLength(2, app.t('name_required'))),
  });

  const values = await app.c.req.parseBody();
  const validation = v.safeParse(CreateSchema, values);

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);

    const html = app.render('create/create.eta', {
      title: app.t('create_postponement_title'),
      isPartial: app.isPartial,
      errors,
      values,
      globalError: errors.global,
    });
    return app.c.html(html, {status: 400});
  }

  const {name} = validation.output;

  const id = generateId();
  const ownerPassword = generateRandomPassword();
  const invitationPassword = generateRandomPassword();

  const session: Postponement = {
    id,
    clubId: DEFAULT_CLUB_ID,
    name,
    ownerPasswordHash: hashPassword(ownerPassword),
    invitationPasswordHash: hashPassword(invitationPassword),
    invitationPassword,
    status: 'Draft',
    organizerTeam: 'home',
    reopenCount: 0,
    players: [],
    proposedDates: [],
    votes: [],
    createdAt: app.timestamp.now(),
  };

  await app.store.save(session);

  const redirectUrl = `/edit/${id}?ownerPassword=${ownerPassword}`;
  if (app.isPartial) {
    app.c.header('HX-Redirect', redirectUrl);
    return app.c.text('', 200);
  }

  return app.c.redirect(redirectUrl);
}
