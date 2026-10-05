# QA Report — Imam Academy v10.1.1

## Scope
Security & Stabilization only. Schema remains 12.

## Baseline before changes
- `npm test`: PASS on v10.1.0.
- `node --check app.js v8.js v9.js v10.js sw.js`: PASS.

## Implemented checks
- Portable backup sanitizer exists and is used by downloaded/shared backups.
- Runtime sanitizer regression test verifies sync key, encryption passphrase, sync authorization secret, PIN hash/salt and WebAuthn credential ID are absent from portable settings.
- Local auto-backup remains an internal same-device recovery snapshot.
- Backup/cloud restore paths preserve current device `sync` and `security` settings.
- Direct `/rest/v1/imam_sync` table reads/writes were removed from the client.
- Supabase SQL drops broad anon policies and revokes direct table privileges.
- Cloud sync uses `imam_sync_push` / `imam_sync_pull` RPC calls with a separate authorization secret.
- Authorization secret is stored server-side only as a bcrypt salted hash.
- Version, HTML metadata and Service Worker cache are aligned to 10.1.1.

## Automated result after changes

```text
npm test
Static checks passed for Imam Academy v10.1.1
```

JavaScript syntax:

```text
node --check app.js   PASS
node --check v8.js    PASS
node --check v9.js    PASS
node --check v10.js   PASS
node --check sw.js    PASS
```

## Browser smoke
NOT TESTED.

A local HTTP server was available, but the container Chromium process did not complete headless startup in this environment (DBus/zygote runtime limitation). No browser PASS is claimed.

## Supabase SQL execution
NOT TESTED against the user's live Supabase project because account access/configuration is not available in this environment.

The SQL is included at `sql/supabase-sync.sql` and must be executed in the target project before enabling v10.1.1 Cloud Sync.

## Data migration
None. Schema remains 12.

## Legacy cloud-sync note
A legacy `imam_sync` row created before v10.1.1 has no `auth_hash`. It is intentionally not auto-claimed, because there is no secure way to prove ownership of an old public row. Preserve local data, remove the old remote row, generate secure Sync credentials, then push a fresh encrypted snapshot.
