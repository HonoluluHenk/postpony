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

  const redirectUrl = `/edit/${id}?ownerPassword=${ownerPassword}`;
  if (app.isPartial) {
    app.c.header('HX-Redirect', redirectUrl);
    return app.c.text('', 200);
  }

  return app.c.redirect(redirectUrl);
};
