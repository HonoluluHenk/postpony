# 01: Prune dead CSS, merge duplicate media queries, drop redundant `!important`

**What to build:** Remove stylesheet rules that no template can reach, and stop defeating the cascade. Dead selectors to remove: from the shared app stylesheet, the clipboard button, multi-row heading, invite-link row, and the proposed-date card/list family; from the edit-page prototype stylesheet, the generator-grid/day/time, not-joined, and roster families. Merge the duplicated medium-breakpoint media blocks and the duplicated small-breakpoint blocks in the shared stylesheet into one each. Remove the three `!important` declarations on the picker button — the app's `design` cascade layer already outranks the framework's `vendor` layer, so they are unnecessary. Appearance and behaviour are unchanged.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] The dead selectors listed above are gone from all stylesheets.
- [x] The shared stylesheet has exactly one media block per affected breakpoint instead of two.
- [x] The picker button no longer uses `!important`, and still sits over the right edge of its field on the edit page.
- [x] `npm run lint`, `npm run test` and `npm run e2e` pass with no screenshot-baseline changes.

## Comments
Implementation `123433f`, review `f70a20a`. Pruned verified-dead selectors from both stylesheets, merged the duplicate 992px/599px blocks, dropped the picker `!important`s; lint/test/e2e green, no baseline PNG changed. Review found no fixable issues.
