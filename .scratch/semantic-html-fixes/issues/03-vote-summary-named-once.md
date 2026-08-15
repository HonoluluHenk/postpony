# 03 — Vote-summary regions named exactly once

**What to build:** Each vote-summary region (Home Team Votes and Away Team Votes on the owner edit page, Vote Summary on the join page) keeps its region landmark and accessible name, but the redundant table caption that duplicated the heading is removed, so the summary title is announced once per region instead of twice.

**Blocked by:** None — can start immediately.

**Status:** done

- [ ] Each vote-summary `<section>` keeps its region role and name — the existing `getByRole('region', ...)` locators still resolve.
- [ ] The vote-tally table no longer carries a caption duplicating the heading; the table still has a clear accessible name from the heading that precedes it.
- [ ] Removing the caption breaks no existing tally tests (row and cell counts unchanged).
