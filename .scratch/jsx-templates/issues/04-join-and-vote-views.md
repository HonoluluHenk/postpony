# 04: Join and vote views on JSX

**What to build:** An invited player opening a join link, registering, voting on proposed dates and seeing the confirmed information gets pages rendered entirely from typed components, with unchanged behaviour and unchanged access rules.

**Blocked by:** 01 (Expand — JSX render seam, layout, and shared views).

**Status:** done

- [x] The join, vote and confirmed-info views are components with declared props, reusing the existing vote view-model shapes.
- [x] The join-get, join-register-post and vote view builders are rewired to the new render call with the ambient view values.
- [x] Access rules are untouched: the team guard and the invitation-password token guard behave exactly as before, and an unknown postponement id still yields a not-found page.
- [x] Vote registration and per-team tally counts render as before, including the shared vote tally at its correct heading level.
- [x] The join handler and vote view specs assert on the returned HTML rather than on render arguments.
- [x] All four locales render, with date input placeholders following the locale input format.
- [x] `npm run verify` passes; the e2e suite is unmodified and accessibility checks stay green.
