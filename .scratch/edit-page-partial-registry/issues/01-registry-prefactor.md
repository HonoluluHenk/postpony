# 01: Registry prefactor

**What to build:** the additive plumbing that makes registry-driven composition possible without changing the rendered tree. After this lands, `<EditPage>` and `renderEditPartials` still emit their current HTML byte-for-byte, but a new module is available to consumers and every edit-piece component has declared its swap target.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

### What ships in this ticket

- A new module exposing the registry shape and an `<OobShell>` wrapper.
- A static property on each of the five edit-piece components named after its existing DOM `id`.
- A battery of tests asserting the registry invariant: every entry's `id` equals its `Component`'s `swapTarget`, and the order is stable.
- Zero behavioural change in either `<EditPage>` or any post-handler partial response.

### Decisions encoded

```ts
// partial-registry module — decision shape, stable
declare module 'hono/jsx/jsx-runtime' {
  interface FunctionComponent<P> {
    swapTarget?: string;
  }
}

export interface EditPartialEntry {
  readonly id: string;
  readonly Component: FunctionComponent<unknown>;
}

export function getEditPartials(): readonly EditPartialEntry[];

export interface OobShellProps { id: string; children?: Child; }
export function OobShell(props: OobShellProps): JSX.Element;
```

Each Component declares `X.swapTarget = 'kebab-id'` matching its current root DOM `id`. The registry's `id` field is read from this property — no second source of truth.

### Acceptance criteria

- [ ] Five edit-piece components expose `swapTarget` static property matching their DOM root `id`.
- [ ] `getEditPartials()` returns one entry per component, in a documented display order.
- [ ] `<OobShell id>` renders a single root child carrying `hx-swap-oob="true"` and an `id` attribute matching its prop.
- [ ] Registry invariant test: each entry's `id` matches its `Component.swapTarget`; duplicate IDs fail; list is non-empty.
- [ ] No change in any rendered byte of `<EditPage>` or any partial endpoint (existing vitest + screenshot baselines stay green).
