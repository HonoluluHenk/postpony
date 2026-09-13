# Review: 06-heading-cleanup

Two-axis review of `febd9f9..HEAD` (commit `0353484` "ticket done: 06-heading-cleanup"),
spec source: `.scratch/edit-page-responsive-redesign/issues/06-heading-cleanup.md`
and `.scratch/edit-page-responsive-redesign/spec.md` (Phase 2).

## Standards

Per-file, the diff conforms to the repo's documented standards:

- **Typed, not stringly.** The now-unused `homeTeam` / `guestTeam` / `matchDateTime`
  props were removed from `EditPageProps` and from the `edit-id-get.tsx` handler,
  so no dead props linger. `schedule_heading` is a typed `TranslationKeys` member.
- **Localization sync.** `en.json` and `de.json` are updated in lockstep: the
  `match_summary` key is removed from both, and `scheduling_engine_info` is renamed
  to `schedule_heading` ("Schedule" / "Spielplan"), placed alphabetically between
  `save_password_warning` and `scrape_back`. `TranslationKeys` derives from
  `en.json`, so the rename extends the type automatically.
- **CSS in `@layer design`.** The orphaned `.match-summary` rule (and its Phase-2
  "interim; deleted" comment) is deleted; no new selectors were needed.
- **Tests not weakened.** The unit render spec replaces the "match summary"
  `describe` with a "schedule heading" `describe` asserting `<h2>Schedule</h2>`
  and the absence of `Match:`. The e2e assertions were re-anchored onto the page
  heading (a11y selectors) rather than deleted. Coverage gate holds (≥80% all metrics).
- **Heading hierarchy preserved.** `h1` → `h2` (Schedule) → `h3` (Players, Proposed
  Dates, vote tables) outline is unchanged; the `semantic-structure` e2e (which
  asserts the heading outline) passes.
- **No new dependencies; deletion over addition.** 23 files changed, −84/+41 lines.

Baseline smells checked: no Mysterious Names, no Duplicated Code (the unboxing is
inherently repeated across the four section components), no Speculative Generality,
no Message Chains, no Middle Man.

Judgement call (not a violation): the `surface-variant` background on the four
edit-page sections is removed AND the now-pointless `<header>` wrappers around the
`h2`/`h3` headings are deleted. Deleting `<header>` is one clean way to strip the
BeerCSS `header` band (`--surface-container` + min-height) that otherwise boxes the
headings; the heading element itself is retained so the accessible name and heading
outline are untouched. An alternative would be a CSS override on `header`, but that
would be more fragile and more code.

## Spec

Every acceptance criterion in the issue is implemented:

- **Boxed background removed for h2/h3** — sections lose `surface-variant`; the
  h2/h3 lose their `header` band. Only the Proposed Date cards remain as cards.
- **Key renamed** — `scheduling_engine_info` → `schedule_heading`, values
  "Schedule" (en) / "Spielplan" (de), both files in sync.
- **Match summary removed** — paragraph deleted from `edit.tsx` (status chip kept),
  `.match-summary` CSS removed, `match_summary` key removed from both locales.
- **Unit render spec** — no match-summary text; new heading text present.
- **e2e + page object** — `EditPage.matchSummary` getter removed; the three e2e
  specs that asserted the summary now assert the page heading; the four edit-page
  screenshot baselines regenerated; `checkA11y` passes.
- **`npm run verify` passes** — lint, 716 unit tests (coverage ≥80%), build, and
  107 e2e tests all green.

No scope creep: the join page, create flow, start page, and non-edit sections
(`surface-variant` on `index.tsx`, `error.tsx`, `create/scrape/*`) are untouched.

## Summary

Standards: 0 hard violations, 1 judgement call (the `<header>` wrapper deletion is
a reasonable mechanism for the unbox, not scope creep).
Spec: all acceptance criteria met, no missing or extra behaviour.
