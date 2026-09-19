# 04: Vote page: one heading, no duplicated title

**What to build:** the vote page currently announces "Vote on Proposed Dates" at two heading levels (the page title and the in-article heading). The document outline carries exactly one "Vote on Proposed Dates" title; where the section keeps an in-article heading, it is a distinct informant string (for example a "your availability" lead-in) in English and German, so it adds signal instead of repeating the title. The section still carries a heading as the layout rules require.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The document outline contains a single "Vote on Proposed Dates" heading; an in-article heading either reads distinctly or is removed.
- [x] The new/varied heading text exists in en and de (fr-CH/it-CH reuse English per ADR-0016).
- [ ] The semantic-structure and axe e2e passes show no duplicate-heading or heading-order violation on the vote page.

## Comments

- `a65fc06` ticket done: 04-vote-page-singular-heading
- `de4a7f6` review: 04-vote-page-singular-heading

Summary: the vote page's in-article `<h2>` now reads "Your availability" (en) /
"Deine Verfügbarkeit" (de) instead of duplicating the "Vote on Proposed Dates" h1;
locale keys + render specs added. Axe/semantic-structure e2e criterion is the
coordinator's, who must also update `JoinPage.voteHeading` / `join()` (see review).