# 01: Perspective-based invitation link labels

**What to build:** On the edit page of a Postponement, the two invitation links are relabeled from the organizer's perspective: the link for the organizer team reads "My team invitation link (<team name>)", the link for the other side reads "Opponent team invitation link (<team name>)". The label follows `organizerTeam`, not the fixed match sides, so an organizer who claimed the guest side still sees "My team" on their own link. Team names come from the stored Match sides; when a side has no name, the label renders without the parenthetical. German locale ships matching translations; French and Italian keep falling back to English (ADR-0016). Link URLs, tokens, and clipboard buttons are untouched.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] Organizer on the home side sees "My team invitation link (Home Team)" on the home-side anchor and "Opponent team invitation link (Guest Team)" on the away-side anchor
- [x] Organizer on the away side sees the labels swapped: own-team wording on the away-side anchor, opponent wording on the home-side anchor
- [x] Missing team name renders the plain label without parentheses — never empty or broken parentheses
- [x] English strings exactly: "My team invitation link (<%= it.teamName %>)", "Opponent team invitation link (<%= it.teamName %>)" plus plain variants
- [x] German strings exactly: "Einladungslink für meine Mannschaft (<%= it.teamName %>)", "Einladungslink für die Gegnermannschaft (<%= it.teamName %>)" plus plain variants
- [x] Old side-named locale keys removed from both locale files; key rename is type-safe via derived translation keys
- [x] Label selection lives behind one exported pure helper over the Postponement; unit spec covers home-side organizer, away-side organizer swap, missing names, and interpolated names
- [x] Existing invitation-link e2e spec asserts both anchors' visible text with default fixture team names; href assertions unchanged
- [x] `npm run lint` and `npm run test` pass

## Comments

- New seam: `inviteLinkLabels(session, t)` in `src/routes/edit/id/invite-link-labels.ts` returning `{home, away}`; `edit.tsx` `InviteLinks` consumes it. List order, hrefs, tokens, clipboard buttons untouched.
- New keys `invite_link_own_label{,_named}` / `invite_link_opponent_label{,_named}` replace `invite_link_home_label` / `invite_link_away_label`; rename verified type-safe by `tsc`.
- Unit spec uses real English translations via `getTranslation('en-US', …)` (prior art: `own-team-votes.spec.tsx`). Note: deep-partial builder can't unset fields via override (lodash `merge` skips `undefined`) — missing-name cases assign `session.homeTeam = undefined` post-build.
- Verified: lint clean, 310/310 unit tests (coverage: stmt 87.0%, branch 78.2%, func 93.3%, line 86.8% — branch figure pre-existing, helper itself fully covered), full Playwright suite 69/69 including extended invitation-link assertions.
