# QA — v11.6.0 Parent ↔ Teacher Messages, Stage 1

- Baseline: OP-Quran-Tracker-v11.5-Stage2-Finance-Quick-Access.zip.
- Release: 11.6.0, local schema: 12.
- Code changes: 15 existing files modified; 5 added; 0 deleted.
- Existing SQL folder: unchanged; new isolated `sql/guardian-messages.sql` (additive only, not yet deployed).
- Regression: `npm test` passed (legacy features and new messages tests).
- JavaScript syntax: `node --check` of all JS files.
- Browser: full local-site navigation blocked by environment (`ERR_BLOCKED_BY_ADMINISTRATOR`); isolated headless Chromium interaction *passed*: teacher inbox visible, mark read/reply events respond; guardian send clears form only on confirmed success; clearing session hides guardian messaging. This is **not** a production Supabase test or a full-app real-device test.
- Security: separate message table, guardian PIN/session gating, teacher-only read/reply RPCs, per-tenant guards, rate limiting, content length checks; disabled accounts not allowed, text escaped before rendering.
- Offline: messages stay remote-only, no fake successful sends. Service Worker shell version advanced without changing network-first/offline boot behavior.
- Deployment order: replace all files preserving `.git` → Commit only → GitHub Desktop screenshot → run `sql/guardian-messages.sql` in Supabase → screenshot Success → Push origin → real-device test with two guardians and one teacher.
- Real-device test cases: teacher home and profile shortcuts; PIN-based guardian send; correct student association; teacher new → read → replied; guardian sees reply after Refresh; other student's messages not exposed; public link contains no inbox; offline shows error and preserves typed draft.
- Not validated until user confirms real mobile + production RPC tests.
