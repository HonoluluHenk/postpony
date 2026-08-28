# 04: Error container drops isOob

**What to build:** `ErrorContainer` no longer knows it's sometimes an OOB target. The partial renderer wraps it in `<OobShell>` like every other sibling, so the component itself has no mode awareness. After this lands, `ErrorContainer` is shape-only.

**Blocked by:** 01-registry-prefactor

**Status:** ready-for-agent

### What ships

- `ErrorContainer` no longer accepts (or reads) a mode flag.
- The partial renderer emits the error container through `<OobShell id="error-container">`.
- Specs that asserted `isOob={true}` calls or `'hx-swap-oob="true"'` literals tied to `ErrorContainer` are rewritten in registry mode (same surface, less repetition).

### Why parallel with 02 and 03

This ticket is independent of `02` and `03` because the partial renderer can already wrap `ErrorContainer` in `<OobShell>` (the registry's `<OobShell>` exists after 01); changing the initial page's usage of `ErrorContainer` is a one-line call-site update, not a cross-component refactor.

### Acceptance criteria

- [ ] `ErrorContainer` prop interface has no boolean-or-mode parameter.
- [ ] No call site passes a mode-or-OOB flag to `ErrorContainer`.
- [ ] Partial endpoint emits `id="error-container" hx-swap-oob="true"` identical to today.
- [ ] Initial page emits `id="error-container"` (no `hx-swap-oob`) identical to today.
- [ ] Vitest specs that referenced `ErrorContainer`'s mode parameter no longer mention it.
