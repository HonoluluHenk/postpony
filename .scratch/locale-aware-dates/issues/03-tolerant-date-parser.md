# 03 — Tolerant per-locale date parser and ISO formatter

**What to build:** Pure functions that (a) parse a user-typed date string in a given `AppLocale` into the ISO persistence form `YYYY-MM-DDTHH:mm`, and (b) format ISO into the locale's input tokens. Tolerant: leading zeros optional, `.`/`/`/`-` accepted as date separators, `am`/`pm` matched case-insensitively with optional surrounding whitespace. Unambiguous: the en-US 12-hour time requires the `am`/`pm` suffix — a bare `8:00` is rejected, never guessed. Unparseable input yields a typed failure, never a thrown exception.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Each locale's canonical format parses to the correct ISO value.
- [ ] Tolerant variants parse: no leading zeros, all three separators, mixed am/pm casing.
- [ ] Bare 12-hour times in en-US are rejected.
- [ ] ISO round-trips to locale tokens and back.
- [ ] Unparseable input returns a failure, not an exception.
