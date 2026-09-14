# 2. Constraints

## 2.1 Technical Constraints

| Constraint                                    | Rationale                                        | Source                                                                          |
|-----------------------------------------------|--------------------------------------------------|---------------------------------------------------------------------------------|
| TypeScript, strict + extra strictness         | type safety for scheduling logic                 | `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, …) |
| `jsx: react-jsx`, `jsxImportSource: hono/jsx` | JSX views are Hono components                    | `tsconfig.json`, ADR-0019                                                       |
| Hono (SSR) + HTMX, no SPA framework           | hypermedia-driven, minimal client JS             | ADR-0003, ADR-0009                                                              |
| SQLite via `@libsql/client` (Turso in prod)   | one JSON-blob document per session               | ADR-0007/0014, ADR-0018                                                         |
| Cloudflare Workers + Workers Assets           | production compute + static assets               | ADR-0018                                                                        |
| Node ≥ 26.1 (native `Temporal`)               | date/time handling without a polyfill at runtime | `README.md`, `mise.toml`                                                        |
| Web Crypto only (PBKDF2-SHA256)               | password hashing portable to Workers             | `src/lib/crypto-utils.ts`                                                       |
| No traditional accounts / login               | players join via token link                      | ADR-0002, ADR-0013                                                              |
| Valibot for input validation                  | tree-shakeable schema validation                 | ADR-0012                                                                        |

## 2.2 Organisational Constraints

| Constraint                                       | Detail                                                                         |
|--------------------------------------------------|--------------------------------------------------------------------------------|
| Code coverage ≥ 90% for all metrics              | policy in `AGENTS.md`; **not** machine-enforced (no vitest `thresholds` block) |
| ESLint, all rules at `error`                     | flat config, `strictTypeChecked` + `stylisticTypeChecked`, `--max-warnings 0`  |
| `explicit-function-return-type`                  | enforced except IIFEs and const arrow assertions                               |
| `<section>` requires a heading as first child    | accessibility convention                                                       |
| One context (`CONTEXT.md`) + ADRs in `docs/adr/` | no `CONTEXT-MAP.md` (single domain)                                            |
| Two Vitest projects under one `vitest run`       | `unit` (node) + `browser` (headless Chromium)                                  |

## 2.3 Conventions and Frameworks

- BeerCSS (Material 3) in `@layer vendor`; design tokens in `@layer design` (`src/public/assets/css/design-tokens.css`).
- Locales `de-CH | fr-CH | it-CH | en-US`; fr-CH/it-CH reuse English text (ADR-0016).
- Entity names singular; max line length 120; 2-space indent.
