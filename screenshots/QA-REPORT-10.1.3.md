# QA Report — We Live Quran v10.1.3

## Automated
- `npm test`: PASS — Static checks passed for We Live Quran v10.1.3.
- `node --check app.js`: PASS
- `node --check auth.js`: PASS
- `node --check v8.js`: PASS
- `node --check v9.js`: PASS
- `node --check v10.js`: PASS
- `node --check sw.js`: PASS

## Regression guards added
- Account namespaced IndexedDB keys.
- Account namespaced localStorage safety copy.
- Explicit Legacy-data claim flow.
- Legacy claim marker + draft migration.
- Account-scoped session drafts and automatic backups.
- No manual Sync ID / Sync Access Secret UI.
- `account_sync` table direct access revoked.
- Account sync RPC restricted to `authenticated` and `auth.uid()`.
- Cloud payload bound to local authenticated user ID.
- Portable backups strip authenticated account metadata.

## Manual / real-device gates
NOT TESTED in this build environment:
- Actual v10.1.2 → v10.1.3 Legacy claim on the teacher's Android phone.
- Switching between two active Google accounts on the same device.
- Supabase `account_sync_push/account_sync_pull` against the live project.
- Restore on a second physical device using the same encryption passphrase.

These must be verified on the live deployment before calling account migration/cloud restore production-verified.
