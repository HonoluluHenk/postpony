# 02 — Make TLS termination optional via config

**What to build:** A configuration flag (e.g. `APP_TLS_ENABLED`, default `true`) that gates whether the Node process opens its own `node:https` server. When `true` the app behaves exactly as today (terminates TLS with cert files). When `false` it serves plain HTTP, suitable for running behind Cloudflare's edge TLS or any reverse proxy. Local development (`npm run dev`) keeps terminating its own TLS because the default stays `true`, so the maintainer's workflow is unchanged while the path to a platform-terminated host is opened.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] A config key controls TLS on/off with a safe default of `true`.
- [x] With the flag `false`, the Node server binds plain HTTP and no certificate files are required.
- [x] With the flag `true` (and unset), current HTTPS behavior is preserved exactly.
- [x] `npm run dev` (default) still serves HTTPS with fixtures.
