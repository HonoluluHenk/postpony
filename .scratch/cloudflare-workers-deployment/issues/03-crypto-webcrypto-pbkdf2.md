# 03 — Migrate password hashing to Web Crypto PBKDF2 (drop `bcryptjs`)

**What to build:** The dual-password security model (owner password + invitation password, per ADR-0002) keeps working, but password hashing moves from `bcryptjs` to the platform built-in Web Crypto `crypto.subtle` PBKDF2-HMAC-SHA256 with a per-password random salt and a high iteration count. Because `crypto.subtle` is asynchronous, `hashPassword` and `comparePassword` become async and their callers await them. `bcryptjs` is removed from dependencies. This works natively on both Node and Cloudflare Workers with no `nodejs_compat` shim. A fresh Turso production database means there are no pre-existing bcrypt hashes to migrate. From a player's perspective, setting and verifying the owner and invitation passwords behaves identically.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] `hashPassword` / `comparePassword` use `crypto.subtle` PBKDF2 with a random salt; both are async.
- [x] All callers (`create-post`, `match-post`, `change-utils`, `join-utils`) and their specs await the new API.
- [x] `bcryptjs` is removed from `package.json` and no longer imported.
- [x] Unit tests cover hash/compare round-trip, wrong-password rejection, and per-password unique salts.
- [x] `npm run lint` and `npm run test` pass.
