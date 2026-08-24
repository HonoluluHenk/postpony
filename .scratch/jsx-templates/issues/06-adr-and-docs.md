# 06: Record the decision and refresh the agent docs

**What to build:** The next person — human or agent — reading the repo learns how rendering works now, why it works that way, and which alternative was rejected, without having to re-litigate the decision or generating template-engine code from stale guidance.

**Blocked by:** 05 (Contract — remove Eta and its Workers-compat scaffolding).

**Status:** ready-for-agent

- [ ] A new ADR records the context (the old engine's filesystem assumption versus a runtime without one), the decision, and the rationale: zero new dependencies, no codegen, typed props at the render boundary.
- [ ] The ADR records the rejected alternative — a build-time static JSX generator — with its reason: it writes HTML at build time and has no per-request rendering API, while this app renders per-request, per-postponement, per-locale HTML.
- [ ] The existing templating ADR is marked superseded, cross-linked in both directions with the new one.
- [ ] The agent guidance file is updated where it mentions templating: the project-structure tree, the framework-patterns section (render call shape, explicit layout-versus-partial choice, translation function as a prop), the quick-reference command table, and the config key list.
- [ ] The context doc and the route-handlers skill no longer reference the template engine or the template-source knob.
- [ ] No source behaviour changes in this ticket; docs only.
