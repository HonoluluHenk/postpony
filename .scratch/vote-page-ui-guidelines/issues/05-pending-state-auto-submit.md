# 05: Pending state for the auto-submitting vote form

**What to build:** Saving a Vote visibly shows that something is happening and cannot be fired twice. When a Participant changes a radio or taps a "Set all" button, the form marks itself busy (`aria-busy`), the global spinner shows, and the form's controls are disabled once the POST is on its way (after the body is captured, so disabled radios are not dropped). Further taps or changes during the in-flight save are ignored. A keyboard user arrowing through a date's options triggers a single save after they settle (~400ms), not one reload per keystroke; a "Set all" click submits immediately and cancels a scheduled radio save. The page does not get stuck in the busy state after a back-navigation.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] After a set-all tap the form gets `aria-busy="true"` and the global spinner shows
- [x] Controls are disabled only after the POST body is complete; all changed votes reach the server
- [x] A second set-all tap or radio change during an in-flight save does nothing
- [x] Two radio changes within the debounce window submit once; a single change submits after it
- [x] A set-all click submits immediately and cancels a pending radio submit
- [x] The busy state resets on `pageshow`
- [x] Browser unit tests cover the client wiring
- [x] Existing vote e2e (cast a vote, set all) stays green
- [x] `npm run verify` passes

## Comments

- `5574307` ticket done: 05-pending-state-auto-submit — `initVoteForm` marks the form busy, shows the shared spinner, disables controls after `form.submit()`, debounces radio changes by 400ms, cancels on set-all, and resets on `pageshow`; browser unit tests added.
- `89d03c9` review: 05-pending-state-auto-submit — two-axis review, one minor Duplicated Code finding.
- `b2cc328` review-fixed: 05-pending-state-auto-submit — extracted the shared vote-control selector.
- `6b1d929` fix: 05-await-debounced-vote-save-in-e2e — `JoinPage` vote helpers now await the save navigation instead of a stale toast, keeping the existing vote e2e green with the debounce.
- `npm run verify` passes (lint → test → build → 125 e2e).
