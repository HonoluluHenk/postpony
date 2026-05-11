import type { App } from '../../app';
import { generateId, generateRandomPassword, hashPassword } from '../../lib/crypto-utils';
import { RescheduleSession } from '../../lib/models';

export const handleCreatePost = async (app: App) => {
  const body = await app.c.req.parseBody();
  const name = body['name'] as string;

  if (!name) {
    return app.c.text('Name is required', 400);
  }

  const id = generateId();
  const ownerPassword = generateRandomPassword();
  const invitationPassword = generateRandomPassword();

  const session: RescheduleSession = {
    id,
    clubId: 'default-club', // Placeholder for MVP
    name,
    ownerPasswordHash: hashPassword(ownerPassword),
    invitationPasswordHash: hashPassword(invitationPassword),
    status: 'Draft',
    players: [],
    createdAt: new Date().toISOString(),
  };

  app.sessions[id] = session;

  const data = {
    title: `Editing ${name}`,
    session,
    ownerPassword,
    isPartial: app.isPartial,
  };

  const html = app.render('edit.eta', data);
  return app.c.html(html);
};
