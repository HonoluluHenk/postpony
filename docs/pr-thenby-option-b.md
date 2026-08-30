# PR: Make `thenby` ESM-first with a CJS interop shim

**Repo:** `Teun/thenby.js` · **Branch:** `esm-first-interop` · **Base:** `master`

## Problem

`thenby` currently defines its public entry conditions (`exports` map) so that ESM
consumers get `thenBy.esm.js` and CJS consumers get `thenBy.module.js`. The CJS
build does:

```js
module.exports = tb;   // tb is a function; tb.firstBy = tb is only a property
```

Node's CJS→ESM synthetic named-export detection (`cjs-module-lexer`) can only
invent named exports from statically-analysable `module.exports.<name> = ...` /
`exports.<name> = ...` statements. It cannot see that the exported *function object*
has a `.firstBy` property, so some loaders (e.g. `tsx`, which resolves the
`require` condition) report:

```
SyntaxError: The requested module 'thenby' does not provide an export named 'firstBy'
```

even though `firstBy` exists at runtime as a property of the default export.

## Solution (Option B)

Make the ESM build (`thenBy.esm.js`) authoritative and turn the CJS build
(`thenBy.module.js`) into a thin shim that exposes an explicit
`module.exports = { firstBy, default: firstBy }`. This guarantees that both
`import { firstBy }` and `import firstBy` (and `require('thenby')`) work
regardless of which build a particular loader resolves:

| Loader / condition  | Resolves to          | `import { firstBy }` | `import firstBy` |
|---------------------|----------------------|----------------------|------------------|
| Node ESM (`import`) | `thenBy.esm.js`      | ✅                   | ✅               |
| tsx / CJS (`require`)| `thenBy.module.js`   | ✅ (via shim)        | ✅               |
| Bundlers            | `module` / `exports` | ✅                   | ✅               |

## Checklist

- [ ] `thenBy.module.d.ts` still describes the public API (unchanged).
- [ ] `thenBy.esm.js` remains the canonical implementation + `export { firstBy }`.
- [ ] `thenBy.module.js` re-exports from the ESM source, or is kept as a parallel
      implementation with an explicit named-export shim (see below).
- [ ] `package.json` pins `"type": "commonjs"` so the `.js` files are treated as CJS,
      and keeps the `exports` map routing `import` → ESM / `require` → CJS.
- [ ] `test`/`build` scripts and the `thenBy.min.js` bundle are regenerated.

---

## Diffs

### 1. `thenBy.module.js` — expose a statically-analysable named export

Instead of exporting only the function, also attach `firstBy` (and a `default`) as
real properties on `module.exports` so `cjs-module-lexer` and every interop layer
picks them up.

**Before**

```js
module.exports = (function () {
    // ... implementation ...
    tb.firstBy = tb;
    return tb;
})();
```

**After**

```js
var firstBy = (function () {
    // ... unchanged implementation ...
    tb.firstBy = tb;
    return tb;
})();

// Explicit, statically-analysable named exports for CJS/ESM interop.
// `cjs-module-lexer` (used by Node and tsx to synthesize named imports from CJS)
// can only detect `module.exports.<name> = ...` assignments, not properties that
// happen to live on an exported function object.
module.exports = firstBy;
module.exports.firstBy = firstBy;
module.exports.default = firstBy;
```

> This keeps the CJS build a drop-in shim: the runtime shape of `require('thenby')`
> is unchanged (still the `firstBy` function), only now it *also* statically exports
> `.firstBy` and `.default`.

### 2. `thenBy.esm.js` — make it the authoritative implementation (unchanged, documented)

No code change needed; it already ends with:

```js
export { firstBy };
export default firstBy;
```

This is the canonical source. Keep it in sync with any implementation edits to the
CJS shim (or, better, generate both from a single source — see `build.mjs` note
below).

### 3. `package.json` — pin module type and deterministic exports

Add `"type": "commonjs"` so the shipped `.js` build scripts are unambiguous, and
keep the explicit conditions so `import` → ESM and `require` → CJS resolve
deterministically.

**After**

```json
{
  "name": "thenby",
  "version": "1.4.2",
  "type": "commonjs",
  "main": "thenBy.module.js",
  "module": "thenBy.esm.js",
  "types": "thenBy.module.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./thenBy.module.d.ts",
        "default": "./thenBy.esm.js"
      },
      "require": {
        "types": "./thenBy.module.d.ts",
        "default": "./thenBy.module.js"
      },
      "default": "./thenBy.module.js"
    },
    "./package.json": "./package.json"
  },
  "sideEffects": false
}
```

Notes:
- `"type": "commonjs"` is the default for `.js` files anyway; declaring it removes
  ambiguity if a future build ever emits `.mjs`.
- The existing `exports` conditions are already correct — they are kept as-is.
- Adding the `./package.json` subpath export is optional but a good practice for
  tooling that reads `package.json`.

### 4. `build.mjs` — single source of truth (recommended)

To avoid the CJS shim drifting from the ESM source, generate both from one
implementation. The repo's `build.mjs` (invoked by `npm run build`) currently
produces `thenBy.module.js`, `thenBy.esm.js`, and `thenBy.min.js`. Refactor it to:

1. Build `thenBy.esm.js` with `export { firstBy }; export default firstBy;`.
2. Generate `thenBy.module.js` as `module.exports = firstBy; module.exports.firstBy
   = firstBy; module.exports.default = firstBy;` from the same source.
3. Run **terser** to emit `thenBy.min.js`, then **tsc** to type-check.

### 5. `tests/` — add interop regression tests

Add a test asserting the dual-import contract so the fix cannot regress:

```js
// tests/interop.test.js (run under both ESM and CJS)
import firstBy, { firstBy as namedFirstBy } from '../thenBy.esm.js';
test('ESM: named and default exports resolve', () => {
  expect(typeof firstBy).toBe('function');
  expect(namedFirstBy).toBe(firstBy);
});
```

```js
// tests/interop.test.cjs
const thenby = require('../thenBy.module.js');
test('CJS: require returns the function and exposes .firstBy', () => {
  expect(typeof thenby).toBe('function');
  expect(thenby.firstBy).toBe(thenby);
  expect(thenby.default).toBe(thenby);
});
```

For Node `import { firstBy } from 'thenby'` actually resolving through the
conditional exports, add a fixture-style test that imports the package by name
using a `node:test` with the package installed into a temp dir (or rely on the
`require.resolve` + `createRequire` check):

```js
const req = createRequire(import.meta.url);
const resolved = req.resolve('thenby'); // must point at thenBy.module.js
```

---

## Verification

After the change:

```bash
npm run build
npm test
# manual interop check across runtimes:
node   --input-type=module -e "import { firstBy } from 'thenby'; console.log(typeof firstBy)"  # function
tsx    -e "import { firstBy } from 'thenby'; console.log(typeof firstBy)"                       # function (was: SyntaxError)
node   -e "const m = require('thenby'); console.log(typeof m, typeof m.firstBy)"                # function function
```

## Impact

- **Breaking change:** none. Runtime shape for both `import` and `require` consumers
  is preserved; this only *adds* the named export the ESM spec already implies.
- **Version:** `1.4.1` → `1.4.2` (minor: additive, interop-only).
