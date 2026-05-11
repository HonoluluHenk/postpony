import { Context } from 'hono';
import { generateId, generateRandomPassword, hashPassword } from '../../lib/crypto-utils';
import { RescheduleSession } from '../../lib/models';
import { render } from '../../lib/renderer';
import { sessions } from '../../lib/session-store';

export const handleCreatePost = async (c: Context) => {
  const body = await c.req.parseBody();
  const name = body['name'] as string;

  if (!name) {
    return c.text('Name is required', 400);
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

  sessions[id] = session;

  const isPartial = !!c.req.header('HX-Request');
  const data = {
    title: `Editing ${name}`,
    session,
    ownerPassword,
    isPartial,
  };

  const html = render('edit.eta', data);
  return c.html(html);
};
