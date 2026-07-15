# Requirements

### Overview & Goals

Implement the player onboarding and voting flow for proposed reschedule dates. Invited players from both teams visit a team-specific invitation link, identify themselves, and vote on proposed dates.

### Scope

**In Scope:**

- Two invitation links on the edit page (home team, away team) replacing the current single link
- Join page: step 1 — player identification (pick existing name or enter new)
- Join page: step 2 — voting on proposed dates (Yes/No/Maybe per date)
- Self-registration (entering a new name adds the player to the respective team)
- Changing votes until the admin finalizes
- Vote summary visible to voters

**Out of Scope:**

- Authentication/impersonation prevention (per user decision)
- Admin voting on behalf of players
- Approval/finalization workflow (separate future task)
- Opponent captain role distinctions

### User Stories

1. As a **home team player**, I receive a home-team invitation link so I can join the rescheduling process.
2. As an **away team player**, I receive an away-team invitation link so I can join the rescheduling process.
3. As an **invited player**, I can select my name from existing players or enter a new name so I am identified.
4. As an **invited player**, I can vote Yes/No/Maybe on each proposed date so my preferences are recorded.
5. As an **invited player**, I can change my votes on subsequent visits so I can update my preferences.
6. As the **admin**, I see two separate invitation links (home/away) on the edit page so I can share the right link with each team.

### Functional Requirements

- The edit page shows two links: `/join/<id>/home?token=<invitationPassword>` and `/join/<id>/away?token=<invitationPassword>`
- The join page step 1 shows a list of existing players for that team (radio buttons) plus an input to add a new name
- Selecting an existing name or entering a new name proceeds to step 2
- Entering a new name creates a `Player` record for the respective team
- Step 2 shows all proposed dates with Yes/No/Maybe vote buttons per date
- Multiple votes (one per proposed date) are submitted together
- If a player revisits, their previous votes are pre-selected
- Player identification is stored in the browser's `localStorage`, keyed by postponement ID (e.g. key `postpony-player-<sessionId>`, value is the `playerId`). A different postponement may yield a different player ID for the same person.
- Voting is disabled (read-only) when session status is `Confirmed`

# Technical Design

### Current Implementation

- **Model** (`src/lib/models.ts`): `RescheduleSession` has `invitationPasswordHash`, `players: Player[]`, `proposedDates: ProposedDate[]`. `Vote` interface exists but is unused. `Player.teamId` is hardcoded to `'home-team'`.
- **Edit page** (`src/routes/edit/id/edit.eta`): Shows single invite link `/join/<id>` (no token in URL, no `/join/` route exists).
- **Session creation** (`src/routes/create/create-post.ts`, `src/routes/create/scrape/meeting-post.ts`): Generates `invitationPassword` and stores hash. Scrape flow captures `homeTeam`/`guestTeam` in `metadata.meeting`.
- **In-memory storage**: Sessions stored in `App.sessions` (static `Record<string, RescheduleSession>`).

### Key Decisions

1. **Single invitation token, team role in URL path**: Keep the existing single `invitationPasswordHash`. The URL encodes the team: `/join/:id/home?token=X` vs `/join/:id/away?token=X`. Simpler model, no extra password fields.
2. **Player identification via localStorage**: Store `{ playerId }` in `localStorage` keyed by session ID (e.g. `postpony-player-<sessionId>`). On return visits, the join page reads the stored playerId client-side and auto-skips to the voting step. Different postponements get independent player identities. No cookies needed.
3. **Votes stored on session**: Add `votes: Vote[]` to `RescheduleSession` for MVP simplicity (in-memory store). No sub-collections needed yet.
4. **Team role as literal type**: Use `'home' | 'away'` for `teamId` on `Player` and derive from URL path.

### Proposed Changes

#### Model changes (`src/lib/models.ts`)

- Add `votes: Vote[]` to `RescheduleSession`
- Change `Player.teamId` type to `'home' | 'away'`

#### Edit page changes (`src/routes/edit/id/edit.eta`, `edit-id-get.ts`)

- Replace single invite link with two links (home/away), each including `?token=<invitationPassword>`
- Pass `invitationPassword` to the template (currently not passed — need to look up or pass from creation flow)
- Since we can't reverse the hash, store the raw `invitationPassword` on the session (or pass it via query param on edit access). Simplest: add `invitationPassword` (unhashed) to `RescheduleSession` for MVP.

#### New join routes (`src/routes/join/`)

- `router.ts` — mounts under `/join`
- `join-get.ts` — GET `/:id/:team` — validates token, renders the join page. Client-side JS reads `localStorage` for an existing `playerId` and skips to step 2 if found.
- `join.eta` — step 1 template (player list + new name input)
- `join-register-post.ts` — POST `/:id/:team/register` — creates or selects player, returns `playerId` in response so the client stores it in `localStorage`, then shows voting step
- `vote.eta` — step 2 template (proposed dates with vote buttons)
- `join-vote-post.ts` — POST `/:id/:team/vote` — saves/updates votes for the player

#### Localization (`src/locales/en.json`, `src/locales/de.json`)

- Add keys: `invite_link_home_label`, `invite_link_away_label`, `join_title`, `join_select_player`, `join_new_player`, `join_continue`, `vote_title`, `vote_yes`, `vote_no`, `vote_maybe`, `vote_submit`, `vote_updated`, `vote_summary`

#### Wire up (`src/index.ts`)

- Import and mount `joinRouter` at `/join`

### File Structure

```
src/routes/join/           (new directory)
  ├── router.ts
  ├── join-get.ts
  ├── join.eta
  ├── join-register-post.ts
  ├── vote.eta
  └── join-vote-post.ts
src/routes/edit/id/edit.eta       (modified — two invite links)
src/routes/edit/id/edit-id-get.ts (modified — pass invitation password)
src/lib/models.ts                 (modified — votes array, teamId type, invitationPassword field)
src/locales/en.json               (modified — new keys)
src/locales/de.json               (modified — new keys)
src/index.ts                      (modified — mount join router)
```

### Architecture Diagram

```mermaid
graph LR
    A[Edit Page] -->|home link| B[GET /join/:id/home?token=X]
    A -->|away link| C[GET /join/:id/away?token=X]
    B --> D{localStorage has playerId?}
    C --> D
    D -->|No| E[Step 1: Identify]
    D -->|Yes| F[Step 2: Vote]
    E -->|POST /join/:id/:team/register| F
    F -->|POST /join/:id/:team/vote| G[Vote saved, show updated summary]
```

# Testing

### Validation Approach

- Unit tests for new route handlers (join-get, register, vote)
- Vitest specs placed alongside source files
- Lint check via `npm run lint`
- Browser verification of the join flow via Chrome DevTools MCP

### Key Scenarios

1. **Token validation**: GET `/join/:id/home` without token → error; with wrong token → error; with correct token → success
2. **Player registration**: POST new name → player added to session with correct team; POST existing name → selects existing player
3. **Voting**: POST votes for all proposed dates → votes stored; revisit → votes pre-selected; change and resubmit → votes updated
4. **Edit page**: Two invitation links displayed with correct URLs including token
5. **localStorage flow**: After registration, `playerId` is stored in `localStorage` under a session-specific key; revisiting the same postponement skips to vote step; a different postponement starts fresh

### Edge Cases

- Session not found → 404
- Invalid team parameter (not 'home' or 'away') → 400
- No proposed dates yet → show message, no vote form
- Session status is 'Confirmed' → votes are read-only
- Player name already exists on team → select existing instead of duplicate

# Delivery Steps

### Step 1: Model changes and edit page invitation links
The edit page shows two team-specific invitation links and the model supports votes.

- Add `votes: Vote[]` to `RescheduleSession` in `src/lib/models.ts`
- Add `invitationPassword: string` (unhashed) to `RescheduleSession` so the edit page can embed it in links
- Change `Player.teamId` type to `'home' | 'away'`
- Update `src/routes/create/create-post.ts` and `src/routes/create/scrape/meeting-post.ts` to store `invitationPassword` and initialize `votes: []`
- Update `src/routes/edit/id/edit-id-get.ts` to pass `invitationPassword` to the template
- Update `src/routes/edit/id/edit.eta` to show two links: home team link and away team link, with `?token=<invitationPassword>`
- Add localization keys `invite_link_home_label` and `invite_link_away_label` to `en.json` and `de.json`
- Update `players-post.ts` to use `'home'` instead of `'home-team'` for `teamId`
- Fix any existing tests affected by model changes

### Step 2: Join page step 1 — player identification and registration
Invited players can visit a team-specific link, identify themselves by picking an existing name or entering a new one.

- Create `src/routes/join/router.ts` mounting GET `/:id/:team` and POST `/:id/:team/register`
- Create `src/routes/join/join-get.ts`: validate token query param against session's `invitationPasswordHash`, validate team param is `'home'|'away'`, always render step 1 page (client-side JS will check `localStorage` for existing `playerId` and auto-redirect to vote step if found)
- Create `src/routes/join/join.eta`: step 1 template with radio buttons listing existing players for the team, plus a text input for new player name, and a continue button
- Create `src/routes/join/join-register-post.ts`: validate input, create new `Player` (if new name) or select existing, return `playerId` in response (client-side JS stores it in `localStorage` as `postpony-player-<sessionId>`), then render step 2 (voting page)
- Wire up `joinRouter` in `src/index.ts` at `/join`
- Add localization keys: `join_title`, `join_select_player`, `join_new_player`, `join_continue`, `join_or_new`
- Add unit tests for token validation and player registration

### Step 3: Join page step 2 — voting on proposed dates
Identified players can vote Yes/No/Maybe on each proposed date and change their votes.

- Create `src/routes/join/vote.eta`: template showing each proposed date with Yes/No/Maybe radio buttons, pre-selected if player has existing votes, submit button, and vote summary table
- Create `src/routes/join/join-vote-post.ts`: parse votes from form, upsert in `session.votes` for the player, re-render vote step with updated summary
- Add GET `/:id/:team/vote?playerId=X` route in `join-get.ts` (or a separate handler) to render the vote template when `playerId` is provided as a query param (sent by client-side JS after reading `localStorage`)
- Show read-only view when session status is `Confirmed`
- Show a message when no proposed dates exist yet
- Add localization keys: `vote_title`, `vote_yes`, `vote_no`, `vote_maybe`, `vote_submit`, `vote_updated`, `vote_no_dates`, `vote_summary`
- Add unit tests for vote submission, vote updating, and read-only state
- Verify the full flow in the browser using Chrome DevTools MCP
