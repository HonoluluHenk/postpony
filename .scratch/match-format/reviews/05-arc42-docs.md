# Review: 05-arc42-docs

Reviewed diff: `402a177...HEAD` (commit `664bac9`).

## Standards

Docs follow the `app-arc42-docs` mapping and house style: long unwrapped prose paragraphs, Mermaid untouched, §9/§12 remain pointers (the glossary change only adds a term name to the CONTEXT pointer, no content duplicated from ADR-0027), and the "Last verified against commit" line is bumped. No code or test files touched (`git status` clean after the docs commit). Markdown was not run through the IntelliJ reformatter: the arc42 files are deliberately long unwrapped paragraphs and reflowing would churn unrelated lines; skipped by design, not rejected.

Judgement calls: §1's ordered list now has a duplicated source number (`4.` twice; the file already carried a duplicated `5.`), which renders correctly as a sequential list — left as-is to avoid renumbering unrelated items.

## Spec

Complete against `.scratch/match-format/issues/05-arc42-docs.md`:

- Sections touched by the new concept and ranking updated — §5 building-block view adds `MatchFormat`/`DEFAULT_MATCH_FORMAT` to `models.ts` and `availabilityRanking` to `postponement.ts`, and describes the builders' band flow plus the four band names; §8.5 rewrites the shared sort-control description from the old raw-headcount grouping to the four Match-Format bands; §1 adds the availability-ranking capability; §12 adds *Match Format* to the CONTEXT pointer. ADR-0027 and CONTEXT.md already carried the domain decision and term, so no duplication was introduced. ✓
- "Last verified against commit" bumped to `402a177` (the last implementation commit before this docs-only change). ✓
- No code or tests change. ✓

No other section is affected: no new route (the sort radios existed), no runtime sequence, external system, dependency, deployment, or cross-cutting concern beyond the §8.5 view rendering update; no new debt for §11.

Summary: Standards 0 issues, Spec 0 issues. Nothing requires a fix.
