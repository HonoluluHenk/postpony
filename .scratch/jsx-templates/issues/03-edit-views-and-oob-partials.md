# 03: Edit page and its out-of-band partial set on JSX

**What to build:** The edit page and every HTMX partial it swaps — proposed dates, team section, own-team votes, status chip, vote tally section — render from typed components. A partial swap and a cold page load produce the same markup because they share one component, making the partial-versus-initial parity invariant structural instead of a convention.

**Blocked by:** 01 (Expand — JSX render seam, layout, and shared views).

**Status:** done

- [x] The edit page and its proposed-dates, team and own-team-votes sections are components whose props extend the existing view-model builder shapes verbatim, adding only the per-render extras (session id, status, reopen count, error text, success flag).
- [x] Out-of-band companions are sibling components of the section they accompany, so the partial response and the initial render share one source.
- [x] The edit partial renderer and the edit-page and players handlers are rewired to the new render call.
- [x] Adding a proposed date returns the section plus its out-of-band companions and no document preamble; a cold load of the edit page contains every element the partial produces.
- [x] Confirmed status hides the add-date form and offers reopen; the reopen chip appears once the reopen count is non-zero.
- [x] Empty collections collapse rather than render empty shells.
- [x] A proposed-dates-section component spec asserts confirmed versus open status, the opponent-votable toggle state, and the presence of the out-of-band companions.
- [x] The edit handler specs assert on the returned HTML rather than on render arguments.
- [x] `npm run verify` passes; the e2e suite is unmodified and accessibility checks stay green.
