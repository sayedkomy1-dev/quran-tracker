# QA Report — We Live Quran v10.1.4

## Automated
- `npm test`: PASS
- `node --check sync-core.js`: PASS
- `node --check app.js`: PASS
- `node --check v8.js`: PASS
- `node --check v9.js`: PASS
- `node --check v10.js`: PASS
- `node --check auth.js`: PASS
- `node --check sw.js`: PASS

## Sync logic unit/regression coverage
- newer `updatedAt` wins: PASS
- tombstone newer than record removes record: PASS
- explicit restore newer than tombstone survives: PASS
- newer tombstone wins across devices: PASS
- deleted student cascades to descendant sessions/tasks: PASS
- client pulls before v2 push: PASS (static regression guard)
- revision conflict retry present: PASS (static regression guard)
- unsafe v1 account-sync RPC execution revoked by SQL: PASS (static regression guard)

## Runtime / external
- Supabase SQL execution on the user's project: NOT TESTED in this build environment.
- Two-real-device concurrent add/edit/delete cycle: NOT TESTED yet; required before Auto Sync is enabled.
- Android PWA runtime after deploy: NOT TESTED yet.

## Release gate
Do not enable Auto Sync until the two-device test in `DEPLOYMENT.md` passes.
