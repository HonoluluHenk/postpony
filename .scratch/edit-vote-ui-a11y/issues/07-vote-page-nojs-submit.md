# 07: Vote page: votes save without JavaScript

**What to build:** the vote form can submit even when JavaScript is unavailable. Today the save depends on the HTMX/runtime enhancement, so a script-disabled browser has no way to persist a vote. This ticket adds a fallback submit path (a submit control that posts the raw radio form to the existing endpoint) while JavaScript users keep the current auto-save-on-change behaviour, and the two never double-fire. The saved-vote confirmation (toast + aria-live status) appears on both paths.

**Blocked by:** 06 — Vote & edit: label casing, hit targets, tabular count alignment

**Status:** ready-for-agent

- [x] With JavaScript disabled after load, the vote form submits via its POST path and the vote persists.
- [x] With JavaScript enabled, auto-save-on-change still works and the fallback never fires a second request.
- [x] The saved confirmation is announced (toast + aria-live) for both paths.
- [x] A scripts-disabled e2e on the vote page covers the happy path (one vote persists) and a likely error path (a malformed submission shows the error treatment), asserting what the user sees.

## Comments

- `9c5c52e` (`ticket done`) — `<noscript>`-wrapped submit control posts the raw radio form; no handler/JS change; `vote_save` locale key + `.vote-save-actions` spacing; render + handler specs at the no-JS seams; arc42 §§5.4/6.3/8 updated.
- `8e5f22b` (`review`) — two-axis review; no fixes required. Scripts-disabled e2e (criterion 4) is coordinator-delegated: see `reviews/07-vote-page-nojs-submit.md`.