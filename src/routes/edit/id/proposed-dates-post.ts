import * as v from 'valibot';
import type { App } from '../../../app';
import { mapValidationToErrors } from '../../../lib/map-validation-to-errors';
import { PostponementRules } from '../../../lib/postponement';
import { parseLocaleDateTime } from '../../../lib/temporal-utils';
import { renderEditPartials } from './render-edit-partials';

export const handleEditProposedDatesPost = async (app: App): Promise<Response> => {
  const id = app.requireParam('id');
  const session = await app.store.get(id);
  if (!session) {
    app.notFound('Session not found');
  }

  const locale = app.locale;

  const ProposedDateSchema = v.object({
    proposedDateTime: v.pipe(
      v.string(),
      v.check((val: string): boolean => parseLocaleDateTime(val, locale) !==
        undefined, app.t('proposed_date_time_invalid')),
    ),
  });

  const values = await app.c.req.parseBody();
  const validation = v.safeParse(ProposedDateSchema, values);

  if (!validation.success) {
    const errors = mapValidationToErrors(validation);

    if (app.isPartial) {
      return app.c.html(renderEditPartials(app, session, {
        proposedDateTime: (values['proposedDateTime'] as string | undefined) ?? '',
        error: errors.fields['proposedDateTime'],
        globalError: errors.global,
      }), {status: 400});
    }

    return app.c.redirect(`/edit/${id}?ownerPassword=${app.c.req.query('ownerPassword') ?? ''}`);
  }

  const {proposedDateTime} = validation.output;
  const parsed = parseLocaleDateTime(proposedDateTime, locale);
  if (!parsed) {
    // Unreachable: the schema already checked parseability.
    app.failure(app.t('proposed_date_time_invalid'));
  }
  const updated = new PostponementRules().proposeDate(session, parsed.toString(), 'owner').session;
  await app.store.save(updated);

  if (app.isPartial) {
    return app.c.html(renderEditPartials(app, updated, {success: true}));
  }
  return app.c.redirect(`/edit/${id}`);
};