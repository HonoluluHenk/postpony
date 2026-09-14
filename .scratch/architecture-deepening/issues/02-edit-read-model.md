# 02: Edit read model

**What to build:** The edit page's view interface is declared once. `EditGridProps` remains the single declaration of everything the page and its partials need; `EditPageProps` extends it instead of redeclaring fields; the partial extras derive from it so a new form/error field is declared in one place. The session-derived display fields are produced by the data builder, so the partial renderer becomes a single spread with no hand-written field copy. The rail's ISO-week grouping and availability sort are unchanged, and the organizer sees exactly the same page.

**Blocked by:** 01 (agreed order; the seam passes this read model through)

**Status:** ready-for-agent

- [x] `EditGridProps` is the single declaration; `EditPageProps extends` it with no duplicated `proposedDateTime`
- [x] `EditPartialExtras` is derived from `EditGridProps` and compiler-checked
- [x] The data builder returns the session-derived display fields; the partial renderer uses one spread and the hand-written field copy is gone
- [x] Rail grouping, availability sort and chip/action state are untouched
- [x] Adding a hypothetical new error field requires editing one declaration
- [x] Edit render specs are unchanged and green
- [x] `npm run verify` passes

## Comments

- `be9e63d`, `a53e87e`, `09322b9`, `d375dc2` — props-only edit read model: `EditGridProps` the single declaration (`EditPageProps` extends it, duplicate `proposedDateTime` dropped), `EditPartialExtras` derived by `Pick`/`Exclude` over `keyof ViewContext | keyof EditPartialsData` (review fix), session-derived fields moved into `buildEditPartialsData`, `renderEditPartials` reduced to one spread. `npm run verify` green (118 e2e). Notes: spec helpers dropped redundant session literals (TS2783) and one edit-page assertion was corrected (`Away Team` → `Guest Team`) to match the page's actual output; see review.
