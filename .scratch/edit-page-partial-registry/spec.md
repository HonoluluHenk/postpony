# Spec: Edit page partial registry

Status: ready-for-agent

## Problem Statement

Adding or changing a piece of the edit view today requires it to be written twice: once for the initial page render and once for the HTMX partial that a Postponement mutator returns. Each piece carries an `oob?: boolean` prop so it can flip between "render inline" and "render with `hx-swap-oob`" depending on which composition it sits in. The two compositions are hand-written JSX trees that have to stay in lockstep. AGENTS.md already documents this as a perennial gotcha. ADR-0019 says the partial-vs-page branching lives only in `pageLayout()` (the layout wrapper), but in practice it is split across the layout and each piece's `oob` prop.

The deletion test applied to four edit components today (`StatusChip`, `OwnTeamVotes`, `VoteTallySection`, `TeamSection`, `ProposedDatesSection`): deleting one would break whichever composition the other leaves out. They earn their keep individually, but the **composition** is the duplicated thing.

The user-facing impact: a screenshot regression for the edit page does not currently guarantee that the same piece, after the same mutation, renders the same content on the partial endpoint. Slight drift between the two trees causes inconsistent UX.

## Solution

Introduce one **EditPartials registry**: a single map of `{id, Component}` pairs that drives both the initial `<EditPage>` composition and the HTMX partial composition. Each Component declares its HTMX swap target ID as a static `swapTarget` property. An `<OobShell id>` wrapper used only by the partial renderer adds `hx-swap-oob="true"`; the components themselves drop the `oob?: boolean` prop and become shape-only.

`<EditPage>` and `renderEditPartials` both consume the registry. The initial layout wraps the registry in the page chrome (success toast, heading, InviteLinks, scheduling-engine-info heading). The partial renderer wraps each registered piece in `<OobShell>` (so the target ID exists for HTMX) and renders the error container as an OOB sibling. The two compositions share one modular source of truth.

The `isPartial` branch in `pageLayout()` stays where it is — it remains the only layout-vs-partial branch. ADR-0019 is re-affirmed, no change.

## User Stories

1. As a **PostPony maintainer adding a new edit view piece** (e.g. a "history" section), I want to declare the component once with `X.swapTarget = 'history'`, so that the registry makes it appear in both the initial page and the partial endpoint with no second composition.
2. As a **PostPony maintainer removing an edit view piece**, I want to delete the component and any registry entry in one step, so that no orphan OOB target remains in the partial endpoint.
3. As a **PostPony maintainer renaming a piece's target ID**, I want the rename to be a one-line change to `swapTarget`, so that the registry, the wrapper, and the initial page stay consistent.
4. As a **PostPony maintainer debugging a "partial didn't update" bug**, I want one canonical list of expected OOB target IDs, so that I can compare what the partial endpoint emits against the registry.
5. As a **Playwright screenshot test author**, I want each piece's full-page and partial screenshot baselines to derive from the same rendered tree, so that visual regressions on one surface predict regressions on the other.
6. As a **reviewer** of a PR changing edit view HTML, I want one composition site to read instead of two parallel trees, so that review attention is on the change, not on cross-tree consistency.
7. As a **PostPony organiser using the edit page**, I want the page I land on after a mutation (e.g. after editing a Proposed Date) to match the initial page after a hard refresh, so that the same information has one canonical rendering.
8. As a **PostPony organiser seeing an error toast after a failed mutation**, I want the error to appear in the same DOM location whether the page was a hard reload or an HTMX partial response, so that muscle memory works.
9. As a **PostPony organiser on a slow network** (HTMX mode after a mutation), I want the page chrome (header, footer, language picker) to NOT re-render, so that the page is responsive.
10. As a **PostPony organiser using a screen reader**, I want landmark navigation (role=status, aria-live) to remain correct after a partial response, so that accessibility is preserved across both compositions.
11. As a **PostPony maintainer adding a new ADR entry to the registry** (e.g. logging which partials ran), I want all registry consumers to pick it up automatically, so that instrumentation has one entry point.
12. As a **PostPony developer onboarding to the edit view**, I want a single file (`partial-registry.ts`) to enumerate the HTMX swap targets and their components, so that the initial mental model is small.
13. As a **PostPony maintainer writing a regression test for an HTMX-specific bug**, I want a stable, registry-driven test surface, so that the test is not coupled to hand-written `<>` JSX nesting.
14. As a **PostPony maintainer refactoring a piece of the edit view**, I want the partial-vs-page decision to not be the piece's concern, so that the piece's tests stay focused on its own shape.
15. As a **PostPony organiser reloading the page mid-flow**, I want a hard refresh to render the same tree the partial endpoint emits, so that the experience is uniform across the two paths.

## Implementation Decisions

### Modules

- **EditPartials registry module** (`src/routes/edit/id/partial-registry.ts`, new): exports `getEditPartials()` returning `{ id, Component }[]` in display order. Each entry's `id` is read from the `swapTarget` property of the `Component`.
- **Components** (`src/routes/edit/id/status-chip.tsx`, `own-team-votes.tsx`, `vote-tally-section.tsx`, `proposed-dates-section.tsx`, `team-section.tsx`): drop the `oob?: boolean` prop. Add `X.swapTarget = '<kebab-id>'` after the function declaration. Components render the same tree in both modes; the `hx-swap-oob` attribute is added by `<OobShell id>` not by the component.
- **`<OobShell>`** (in partial-registry module): a small wrapper that adds `hx-swap-oob="true"` to a single root child, identified by ID. Used only by the partial renderer.
- **`render-edit-partials.tsx`**: keeps `buildEditPartialsData` (the data projection). The composition becomes a registry walk plus `<OobShell>` wrapping plus the `ErrorContainer` OOB sibling. `ProposedDatesSectionPartial` is replaced by the registry's `proposed-dates-section` entry.
- **`edit.tsx`**: `<EditPage>` keeps page-only blocks (success toast, InviteLinks, scheduling-engine-info heading, ChangeMatchDetails link). The data-bearing sections compose via the registry.
- **`layouts/main.tsx`**: unchanged. `pageLayout()` remains the only `isPartial → layout` branch.

### Interfaces / types

```ts
// partial-registry.ts (decision shape — stable)
declare module 'hono/jsx/jsx-runtime' {
  interface FunctionComponent<P> {
    swapTarget?: string;
  }
}

interface EditPartialEntry {
  id: string;          // e.g. 'status-chip'
  Component: FunctionComponent<any>;
}

export function getEditPartials(): readonly EditPartialEntry[];

// OobShell — used only by partial renderer
export interface OobShellProps { id: string; children?: Child; }
export function OobShell(props: OobShellProps): JSX.Element;
```

The registry is an ordered array. Display order is the source of truth for both initial and partial rendering. Adding a piece appends; reordering reshuffles both surfaces together.

### Architectural decisions

- **Single seam.** `getEditPartials()` is the one seam. Two consumers (`<EditPage>`, `renderEditPartials`) justify it as a real seam (more than a hypothetical adapter).
- **Static `swapTarget` on each Component.** Chosen over a sidecar map: keeps the declaration co-located with the component that owns it. Loss of "single map file" is acceptable because the registry-walk function reads each entry's own ID.
- **Swap-mode wrapper, not in-component branching.** The composition code decides where `<OobShell>` wraps; components stay shape-only. The deleted `oob?: boolean` prop is the inversion of the previous shallow module surface.
- **Schema constant, not stringly typed.** Where possible, type the registry to a string-literal union so that typo'd IDs are caught at compile time.
- **DOM ID style = code style.** `swapTarget` values use kebab-case to match the DOM IDs, no conversion layer.

### Data projection

`buildEditPartialsData` stays. Its outputs (tallies, own-team view, vote tally items) are shared by both the initial page and the partial endpoint. The duplication of the projection (today it is in two places) is folded into one. The component-level differences (e.g. `StatusChip` reads status, `OwnTeamVotes` reads ownTeamResults) match their props.

### Error container

`ErrorContainer.isOob` is the last instance of "component knows about OOB." After this change, the partial renderer wraps `ErrorContainer` in `<OobShell>` just like every other sibling. The `isOob` prop is removed.

## Testing Decisions

### What makes a good test

- **External behaviour only.** Tests assert the rendered DOM at registry surface (tags, IDs, attributes, text), not internal branches in components.
- **Test registry, not each component.** One snapshot per registry entry, taken in both `inline` and `oob` modes. Total snapshots: N entries × 2 modes.
- **One TestPage test** for `<EditPage>` composing the registry — proves that the initial page list matches the partial endpoint list.

### Modules tested

- `partial-registry.ts` — registry shape: every entry has a non-empty id; every Component declares the matching `swapTarget`; ordering is stable.
- One snapshot test per registered Component for both modes; replaces today's per-component `oob?: boolean` tests.
- One composability test for `<EditPage>` — proves registry-driven composition emits a tree matching the partial surface (same IDs, same number of OOB targets).
- Existing Playwright screenshot tests for the edit page and the proposed-dates post endpoint must continue to pass unchanged (their baselines encode the consumer-side view).

### Prior art

- `vitest browser mode` snapshots (`src/lib/**/*.spec.ts*`) for component-level rendering.
- `e2e-tests/pages/EditPage.ts` for the user-facing regression.
- `toHaveScreenshot` baselines already cover both initial and partial surfaces.

### Coverage floor

Coverage target unchanged: 80%+ across all metrics. Removing the `oob?: boolean` prop deletes a small handful of test cases without removing meaningful coverage, since the new registry-driven tests cover both modes in one snapshot each.

## Out of Scope

- Vote-tally type fragmentation (C2 in the architecture review). Treated separately.
- Date-parse-runs-twice (C4). Treated separately.
- Dead code in `temporal-utils.ts` (C7). Treated separately.
- Any non-edit route's partial-vs-page composition (create, join, scrape). The same shape problem exists in those routes but is out of scope here.
- Refactoring `PostponementRules`, view projections, or JSX-per-component typing beyond what's needed to drop `oob?: boolean`.
- Any change to ADR-0019. ADR-0019 is re-affirmed by this spec; no new ADR.

## Further Notes

- **Migration risk:** touchpoints are local. Spec does not require changes to `src/lib/`. Visual regression baselines should not shift.
- **AGENTS.md:** the "partial vs initial render gotcha" line is refined to "the registry (`src/routes/edit/id/partial-registry.ts`) is the source of truth for which HTMX swap targets exist; every entry must be rendered in `<EditPage>` by virtue of being a registry entry." This is a doc-only follow-up.
- **Owners of JSX components (`team-section`, …):** no behavioural change. Each keeps its props; the prop type simply removes `oob?: boolean`.
- **No new external dependency.** Static property assignment is plain TS.
