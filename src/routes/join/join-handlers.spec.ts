import { describe, expect, test } from 'vitest';
import { aPlayer, aProposedDate, aSession, aVote } from '../../lib/__test-utils__/builders';
import { createApp } from '../../lib/__test-utils__/create-app';
import { hashPassword } from '../../lib/crypto-utils';
import { handleJoinGet } from './join-get';
import { handleJoinRegisterPost } from './join-register-post';
import { handleJoinVoteGet } from './join-vote-get';
import { handleJoinVotePost } from './join-vote-post';

const TOKEN = 'invitation-pw';

async function seedSession(overrides: Parameters<typeof aSession>[0] = {}): Promise<ReturnType<typeof aSession>> {
  return aSession({invitationPasswordHash: await hashPassword(TOKEN), ...overrides});
}

describe('join handlers', () => {

  describe('handleJoinGet', () => {
    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing', team: 'home'}, queries: {token: TOKEN}});

      await expect(handleJoinGet(app))
        .rejects
        .toThrow('Session not found');
    });

    test('throws when the token is missing', async () => {
      const session = await seedSession();
      const app = createApp({params: {id: session.id, team: 'home'}});
      await app.store.save(session);

      await expect(handleJoinGet(app))
        .rejects
        .toThrow('Invalid or missing invitation token.');
    });

    test('throws when the token is wrong', async () => {
      const session = await seedSession();
      const app = createApp({params: {id: session.id, team: 'home'}, queries: {token: 'nope'}});
      await app.store.save(session);

      await expect(handleJoinGet(app))
        .rejects
        .toThrow('Invalid or missing invitation token.');
    });

    test('throws when the team parameter is invalid', async () => {
      const session = await seedSession();
      const app = createApp({params: {id: session.id, team: 'spectators'}, queries: {token: TOKEN}});
      await app.store.save(session);

      await expect(handleJoinGet(app))
        .rejects
        .toThrow('Invalid team. Expected \'home\' or \'away\'.');
    });

    test('renders the join page for a valid token and team', async () => {
      const session = await seedSession({players: [aPlayer({name: 'Alice'})]});
      const app = createApp({params: {id: session.id, team: 'home'}, queries: {token: TOKEN}});
      await app.store.save(session);

      const response = await handleJoinGet(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('Join the Postponement');
      expect(body)
        .toContain('Select your name');
      expect(body)
        .toContain('name="playerId" value="player-1"');
      expect(body)
        .toContain('Alice');
      expect(body)
        .toContain(`action="/join/${session.id}/home/register?token=${TOKEN}"`);
      expect(body)
        .toContain(`postpony-player-${session.id}-home`);
    });

    test('renders the register form carrying a pending vote in its action', async () => {
      const session = await seedSession({proposedDates: [aProposedDate()]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, 'vote-proposed-date-1': 'Yes'},
      });
      await app.store.save(session);

      const response = await handleJoinGet(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain(`action="/join/${session.id}/home/register?token=${TOKEN}&amp;vote-proposed-date-1=Yes`);
      expect(body)
        .toContain("key.indexOf('vote-') === 0");
    });
  });

  describe('handleJoinRegisterPost', () => {
    test('creates a new player for the given team and redirects to the vote step', async () => {
      const session = await seedSession();
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN},
        body: {newPlayerName: 'Alice'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toMatchObject([{name: 'Alice', teamId: 'away'}]);
      expect(response.status)
        .toBe(302);
      const location = response.headers.get('Location') ?? '';
      expect(location)
        .toContain(`playerId=${stored?.players[0]?.id ?? ''}`);
      expect(location)
        .toContain(`token=${TOKEN}`);
    });

    test('selects an existing player by name without creating a duplicate', async () => {
      const existing = aPlayer({id: 'away-1', name: 'Bob', teamId: 'away'});
      const session = await seedSession({players: [existing]});
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN},
        body: {newPlayerName: 'bob'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toMatchObject([{id: 'away-1', name: 'Bob', teamId: 'away'}]);
      expect(response.headers.get('Location') ?? '')
        .toContain('playerId=away-1');
    });

    test('selects an existing player by id', async () => {
      const existing = aPlayer({id: 'home-1', name: 'Carol', teamId: 'home'});
      const session = await seedSession({players: [existing]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN},
        body: {playerId: 'home-1'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toMatchObject([{id: 'home-1', name: 'Carol', teamId: 'home'}]);
      expect(response.headers.get('Location') ?? '')
        .toContain('playerId=home-1');
    });

    test('returns the join form with an inline error when neither a name nor a selection is provided', async () => {
      const session = await seedSession();
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN},
        body: {},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('Please select your name or enter a new one.');
      expect(body)
        .toContain('role="alert"');
      expect(body)
        .toContain('aria-invalid="true"');
    });

    test('blocks registration when the session is Confirmed and redirects to the confirmed view', async () => {
      const session = await seedSession({status: 'Confirmed'});
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN},
        body: {newPlayerName: 'Alice'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toHaveLength(0);
      expect(response.status)
        .toBe(302);
      expect(response.headers.get('Location') ?? '')
        .toContain(`/join/${session.id}/away`);
    });

    test('appends pending votes to the redirect back to the vote page', async () => {
      const session = await seedSession({proposedDates: [aProposedDate()]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, 'vote-proposed-date-1': 'IfNecessary'},
        body: {newPlayerName: 'Alice'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      expect(response.status)
        .toBe(302);
      const location = response.headers.get('Location') ?? '';
      expect(location)
        .toContain('/vote');
      expect(location)
        .toContain('vote-proposed-date-1=IfNecessary');
    });

    test('keeps pending votes in the register form action on the inline error re-render', async () => {
      const session = await seedSession({players: [aPlayer()], proposedDates: [aProposedDate()]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, 'vote-proposed-date-1': 'No'},
        body: {},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain(`action="/join/${session.id}/home/register?token=${TOKEN}&amp;vote-proposed-date-1=No"`);
    });

    test('allows registration when the session is Draft (pre-proposal)', async () => {
      const session = await seedSession({status: 'Draft'});
      const app = createApp({
        params: {id: session.id, team: 'away'},
        queries: {token: TOKEN},
        body: {newPlayerName: 'Alice'},
      });
      await app.store.save(session);

      const response = await handleJoinRegisterPost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.players)
        .toMatchObject([{name: 'Alice', teamId: 'away'}]);
      expect(response.status)
        .toBe(302);
    });

    test('throws when the token is wrong', async () => {
      const session = await seedSession();
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: 'nope'},
        body: {newPlayerName: 'Alice'},
      });
      await app.store.save(session);

      await expect(handleJoinRegisterPost(app))
        .rejects
        .toThrow('Invalid or missing invitation token.');
    });
  });

  describe('handleJoinVoteGet', () => {
    test('renders the vote step for an identified player', async () => {
      const session = await seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);

      expect(response.status)
        .toBe(200);
    });

    test('redirects to step 1 when the player is unknown', async () => {
      const session = await seedSession({proposedDates: [aProposedDate()]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'ghost'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);

      expect(response.status)
        .toBe(302);
      expect(response.headers.get('Location') ?? '')
        .toContain(`/join/${session.id}/home`);
    });

    test('preserves the pending vote in the redirect when the player is unknown', async () => {
      const session = await seedSession({proposedDates: [aProposedDate()]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'ghost', 'vote-proposed-date-1': 'Yes'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);

      expect(response.status)
        .toBe(302);
      const location = response.headers.get('Location') ?? '';
      expect(location)
        .toContain(`/join/${session.id}/home`);
      expect(location)
        .toContain('vote-proposed-date-1=Yes');
    });

    test('does not echo invalid vote values through the fallback redirect', async () => {
      const session = await seedSession({proposedDates: [aProposedDate()]});
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'ghost', 'vote-proposed-date-1': 'Maybe'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);

      expect(response.status)
        .toBe(302);
      const location = response.headers.get('Location') ?? '';
      expect(location)
        .toContain(`/join/${session.id}/home`);
      expect(location)
        .not
        .toContain('vote-proposed-date-1');
    });

    test('does not carry votes for closed dates through the fallback redirect', async () => {
      const session = await seedSession({
        proposedDates: [
          aProposedDate({id: 'open', votable: true}),
          aProposedDate({id: 'closed', votable: false}),
        ],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'ghost', 'vote-open': 'Yes', 'vote-closed': 'No'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);

      expect(response.status)
        .toBe(302);
      const location = response.headers.get('Location') ?? '';
      expect(location)
        .toContain('vote-open=Yes');
      expect(location)
        .not
        .toContain('vote-closed');
    });

    test('casts a vote from a one-click GET link and renders the poll', async () => {
      const session = await seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1', 'vote-proposed-date-1': 'Yes'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);
      const body = await response.text();

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toMatchObject([{proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes'}]);
      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('value="Yes" checked');
    });

    test('a second click with a different choice silently updates the existing vote', async () => {
      const session = await seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
        votes: [aVote({participantId: 'player-1', proposedDateId: 'proposed-date-1', type: 'Yes'})],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1', 'vote-proposed-date-1': 'No'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toMatchObject([{proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'No'}]);
      expect(response.status)
        .toBe(200);
    });

    test.each(['home', 'away'] as const)('ignores the Vote in a GET link for a closed date for the %s team', async (team) => {
      const session = await seedSession({
        players: [aPlayer({teamId: team})],
        proposedDates: [
          aProposedDate({id: 'open', votable: true}),
          aProposedDate({id: 'closed', votable: false}),
        ],
      });
      const app = createApp({
        params: {id: session.id, team},
        queries: {
          token: TOKEN,
          playerId: 'player-1',
          'vote-open': 'Yes',
          'vote-closed': 'No',
        },
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toMatchObject([{proposedDateId: 'open', participantId: 'player-1', type: 'Yes'}]);
      expect(response.status)
        .toBe(200);
    });

    test('ignores an out-of-domain vote value in a GET link', async () => {
      const session = await seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1', 'vote-proposed-date-1': 'Maybe'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toHaveLength(0);
      expect(response.status)
        .toBe(200);
    });

    test('throws when the session does not exist', async () => {
      const app = createApp({params: {id: 'missing', team: 'home'}, queries: {token: TOKEN}});

      await expect(handleJoinVoteGet(app))
        .rejects
        .toThrow('Session not found');
    });

    test('throws when the token is missing', async () => {
      const session = await seedSession();
      const app = createApp({params: {id: session.id, team: 'home'}});
      await app.store.save(session);

      await expect(handleJoinVoteGet(app))
        .rejects
        .toThrow('Invalid or missing invitation token.');
    });

    test('throws when the token is wrong', async () => {
      const session = await seedSession();
      const app = createApp({params: {id: session.id, team: 'home'}, queries: {token: 'nope'}});
      await app.store.save(session);

      await expect(handleJoinVoteGet(app))
        .rejects
        .toThrow('Invalid or missing invitation token.');
    });

    test('throws when the team parameter is invalid', async () => {
      const session = await seedSession();
      const app = createApp({params: {id: session.id, team: 'spectators'}, queries: {token: TOKEN}});
      await app.store.save(session);

      await expect(handleJoinVoteGet(app))
        .rejects
        .toThrow('Invalid team. Expected \'home\' or \'away\'.');
    });

    test('does not cast on a Confirmed postponement and renders the confirmed-info view', async () => {
      const session = await seedSession({
        status: 'Confirmed',
        confirmedProposedDateId: 'proposed-date-1',
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
        votes: [aVote({participantId: 'player-1', proposedDateId: 'proposed-date-1', type: 'Yes'})],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1', 'vote-proposed-date-1': 'No'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);
      const body = await response.text();

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toMatchObject([{proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes'}]);
      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('Voting is closed');
    });

    test.each(['home', 'away'] as const)('renders the pre-proposal empty-state hint for the %s team with no votable dates', async (team) => {
      const session = await seedSession({
        status: 'Draft',
        players: [aPlayer({teamId: team})],
        proposedDates: [aProposedDate({votable: false})],
      });
      const app = createApp({
        params: {id: session.id, team},
        queries: {token: TOKEN, playerId: 'player-1'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('No dates have been proposed yet');
      expect(body)
        .not
        .toContain('name="vote-');
      expect(body)
        .not
        .toContain('Vote Summary');
    });

    test('renders the confirmed-info view on the vote route when the session is Confirmed', async () => {
      const session = await seedSession({
        status: 'Confirmed',
        confirmedProposedDateId: 'proposed-date-1',
        reopenCount: 1,
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
      });
      await app.store.save(session);

      const response = await handleJoinVoteGet(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('Voting is closed');
      expect(body)
        .toContain('Sep 1, 2025');
      expect(body)
        .toContain('Reopened');
      expect(body)
        .not
        .toContain('name="vote-');
      expect(body)
        .not
        .toContain('Vote Summary');
    });

    test('renders the confirmed-info view on the join route when the session is Confirmed', async () => {
      const session = await seedSession({
        status: 'Confirmed',
        confirmedProposedDateId: 'proposed-date-1',
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN},
      });
      await app.store.save(session);

      const response = await handleJoinGet(app);
      const body = await response.text();

      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('Voting is closed');
      expect(body)
        .not
        .toContain('join_select_player');
      expect(body)
        .not
        .toContain('name="newPlayerName"');
    });
  });

  describe('handleJoinVotePost', () => {
    test('stores a new vote for each proposed date', async () => {
      const session = await seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
        body: {'vote-proposed-date-1': 'Yes'},
      });
      await app.store.save(session);

      const response = await handleJoinVotePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toMatchObject([{proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes'}]);
      expect(response.status)
        .toBe(200);
    });

    test('updates an existing vote instead of duplicating it', async () => {
      const session = await seedSession({
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
        votes: [aVote({participantId: 'player-1', proposedDateId: 'proposed-date-1', type: 'Yes'})],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
        body: {'vote-proposed-date-1': 'No'},
      });
      await app.store.save(session);

      await handleJoinVotePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toMatchObject([{proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'No'}]);
    });

    test.each(['home', 'away'] as const)('ignores the Vote posted for a closed date for the %s team', async (team) => {
      const session = await seedSession({
        players: [aPlayer({teamId: team})],
        proposedDates: [
          aProposedDate({id: 'open', votable: true}),
          aProposedDate({id: 'closed', votable: false}),
        ],
      });
      const app = createApp({
        params: {id: session.id, team},
        queries: {token: TOKEN, playerId: 'player-1'},
        body: {'vote-open': 'Yes', 'vote-closed': 'No'},
      });
      await app.store.save(session);

      const response = await handleJoinVotePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toMatchObject([{proposedDateId: 'open', participantId: 'player-1', type: 'Yes'}]);
      expect(response.status)
        .toBe(200);
    });

    test('does not change votes when the session is confirmed', async () => {
      const session = await seedSession({
        status: 'Confirmed',
        players: [aPlayer()],
        proposedDates: [aProposedDate()],
        votes: [aVote({participantId: 'player-1', proposedDateId: 'proposed-date-1', type: 'Yes'})],
      });
      const app = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'player-1'},
        body: {'vote-proposed-date-1': 'No'},
      });
      await app.store.save(session);

      const response = await handleJoinVotePost(app);

      const stored = await app.store.get(session.id);
      expect(stored?.votes)
        .toMatchObject([{proposedDateId: 'proposed-date-1', participantId: 'player-1', type: 'Yes'}]);
      expect(response.status)
        .toBe(200);
      expect(await response.text())
        .toContain('Voting is closed');
    });
  });

  describe('fallback intent through the register step', () => {
    test('the full chain: unknown player GET -> register POST -> vote GET casts the Vote on arrival', async () => {
      const session = await seedSession({
        players: [aPlayer({id: 'alice', name: 'Alice'})],
        proposedDates: [aProposedDate()],
      });

      // Step 1: click an unpersonalized vote link — unknown player, pending intent
      const step1 = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'ghost', 'vote-proposed-date-1': 'Yes'},
      });
      await step1.store.save(session);

      const registerRedirect = await handleJoinVoteGet(step1);
      const registerUrl = registerRedirect.headers.get('Location') ?? '';
      expect(registerUrl)
        .toContain(`/join/${session.id}/home`);
      expect(registerUrl)
        .toContain('vote-proposed-date-1=Yes');

      // Step 2: register by selecting the existing player, pending vote in the query
      const step2 = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, 'vote-proposed-date-1': 'Yes'},
        body: {playerId: 'alice'},
      });
      await step2.store.save(session);

      const voteRedirect = await handleJoinRegisterPost(step2);
      const voteUrl = voteRedirect.headers.get('Location') ?? '';
      expect(voteUrl)
        .toContain('/vote');
      expect(voteUrl)
        .toContain('vote-proposed-date-1=Yes');

      // Step 3: GET /vote — player now known, vote casts automatically on arrival
      const step3 = createApp({
        params: {id: session.id, team: 'home'},
        queries: {token: TOKEN, playerId: 'alice', 'vote-proposed-date-1': 'Yes'},
      });
      await step3.store.save(session);

      const response = await handleJoinVoteGet(step3);
      const body = await response.text();

      const storedFinal = await step3.store.get(session.id);
      expect(storedFinal?.votes)
        .toMatchObject([{proposedDateId: 'proposed-date-1', participantId: 'alice', type: 'Yes'}]);
      expect(response.status)
        .toBe(200);
      expect(body)
        .toContain('value="Yes" checked');
    });
  });

});
