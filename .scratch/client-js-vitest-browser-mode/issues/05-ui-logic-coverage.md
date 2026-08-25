# 05: UI logic covered, coverage gate closed

**What to build:** The remaining client-side behaviour is exercised in a real browser: whether an HTMX error response is worth swapping, whether a stored language should trigger a redirect without looping, whether a delete dialog opens and dismisses — including from a trigger injected after initialization, the way an HTMX swap does it — whether a copy button writes the right value and reverts its icon, and whether focus lands on the right heading after a swap. Each vendor-dependent init function is proven to be a no-op when its global is absent, so a page loading only a subset of the vendor scripts never errors. With these in place the coverage figure for client-side JavaScript is back over the 80% bar and the full verify gate is green.

**Blocked by:** 03 (Vitest browser project runs a first real spec). Parallel with 04 — different module.

**Status:** ready-for-agent

- [ ] Error-swap decision asserted for: body with non-out-of-band content, out-of-band-only body, body with no out-of-band element at all, and an empty or whitespace-only body (must not throw)
- [ ] Language decision asserted for: query string already carries a language (loop guard), stored value matches the document language, stored value differs (returns the language-qualified URL)
- [ ] Delete-dialog delegation asserted against a real modal dialog: a trigger opens it, a dismiss control closes it, and a trigger injected after initialization still works
- [ ] Clipboard copy asserted with a stubbed clipboard and fake timers: the dataset value is written, the icon swaps, and the original is restored after the revert delay
- [ ] Focus management asserted for the main content region and each of the three management regions: the first heading receives a negative tab index and focus; a non-element target is ignored without throwing
- [ ] Each vendor-dependent init function is a no-op when its global is absent
- [ ] Coverage for the client-side JavaScript is at or above 80% on all metrics
- [ ] Full verify gate green: lint, both Vitest projects, build, and the unchanged Playwright suite
