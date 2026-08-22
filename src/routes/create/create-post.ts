import * as v from 'valibot';
import type { App } from '../../app';
import { generateId, generateRandomPassword, hashPassword } from '../../lib/crypto-utils';
import { mapValidationToErrors } from '../../lib/map-validation-to-errors';
import { DEFAULT_CLUB_ID, type Postponement } from '../../lib/models';
import { derivePostponementName } from '../../lib/postponement';
import { parseLocaleDateTime } from '../../lib/temporal-utils';
import { requireChangeSession } from './change-utils';

export async function handleCreatePost(app: App): Promise<Response> {
  const locale = app.locale;

  const CreateSchema = v.object({
    homeTeam: v.pipe(v.string(), v.trim(), v.minLength(1, app.t('home_team_required'))),
    guestTeam: v.pipe(v.string(), v.trim(), v.minLength(1, app.t('guest_team_required'))),
    originalMatchDateTime: v.pipe(
      v.string(),
      v.trim(),
      v.check(
        (val: string): boolean => parseLocaleDateTime(val, locale) !== undefined,
        app.t('original_match_date_time_invalid'),
      ),
    ),
  });

  const values = await app.c.req.parseBody();
  const validation = v.safeParse(CreateSchema, values);

  const sessionId = typeof values['sessionId'] === 'string' ? values['sessionId'] : undefined;
  const ownerPassword = typeof values['ownerPassword'] === 'string' ? values['ownerPassword'] : undefined;
  const changeMode = !!sessionId;

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);

    const html = app.render('create/create.eta', {
      title: changeMode ? app.t('change_match_details_title') : app.t('create_postponement_title'),
      isPartial: app.isPartial,
      errors,
      values,
      globalError: errors.global,
      ...(changeMode ? {changeMode: true, sessionId, ownerPassword} : {}),
    });
    return app.c.html(html, {status: 400});
  }

  const {homeTeam, guestTeam, originalMatchDateTime: rawDateTime} = validation.output;
  const parsed = parseLocaleDateTime(rawDateTime, locale);
  if (!parsed) {
    // Unreachable: the schema already checked parseability.
    app.failure(app.t('original_match_date_time_invalid'));
  }
  const originalMatchDateTime = parsed.toString({smallestUnit: 'minute'});

  if (changeMode) {
    if (!ownerPassword) {
      app.failure(app.t('invalid_owner_password'), 403);
    }
    const session = await requireChangeSession(app, sessionId, ownerPassword);
    const updated: Postponement = {
      ...session,
      name: derivePostponementName(homeTeam, guestTeam, originalMatchDateTime, locale),
      homeTeam,
      guestTeam,
      originalMatchDateTime,
      // The match was entered by hand; the scrape-only provenance no longer applies.
      metadata: undefined,
    };
    await app.store.save(updated);

    const redirectUrl = `/edit/${session.id}?ownerPassword=${ownerPassword}`;
    if (app.isPartial) {
      app.c.header('HX-Redirect', redirectUrl);
      return app.c.text('', 200);
    }
    return app.c.redirect(redirectUrl);
  }

  const id = generateId();
  const newOwnerPassword = generateRandomPassword();
  const invitationPassword = generateRandomPassword();

  const session: Postponement = {
    id,
    clubId: DEFAULT_CLUB_ID,
    name: derivePostponementName(homeTeam, guestTeam, originalMatchDateTime, locale),
    homeTeam,
    guestTeam,
    originalMatchDateTime,
    ownerPasswordHash: hashPassword(newOwnerPassword),
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

  const redirectUrl = `/edit/${id}?ownerPassword=${newOwnerPassword}`;
  if (app.isPartial) {
    app.c.header('HX-Redirect', redirectUrl);
    return app.c.text('', 200);
  }

  return app.c.redirect(redirectUrl);
}
