# v11.7.1 Supervision visibility hotfix — QA and safety audit

Baseline: `OP-Quran-Tracker-v11.7-Stage1-Teacher-Ratings-Supervision.zip`.

## Finding and fix
- Owner authentication succeeds in the supplied screenshots but the supervisor shortcut is absent. Original JS silently suppressed the shortcut after a failed permission RPC and depended solely on an auth startup hook with a stale URL cache key.
- Entry appears at the top of quick actions for the locally identified owner; remote RPC `app_supervision_access` is still required for any dashboard content.
- Retry & visible failure reasons are shown, including expired Google session, network and denied permission. No remote data is displayed until the server confirms authorization.
- Explicit new asset cache keys and PWA service-worker cache version prevent the changed auth and supervisor files from remaining cached by the previous deployment.
- A backup one-time startup hook protects against an older cached auth script.

## Privacy and safety
- No database schema changes, no additional SQL, no user/profile/session/grade data migrated or reset. Local IndexedDB schema remains 12.
- Teacher rating results remain private to the server-authorized owner/supervisor. Cached owner role shows only an entry point. Server denies reads if token is expired or role is revoked.
- Existing WhatsApp, guardian portal, PIN and offline shell were not changed.
- Supervisor entry needs online access to read data; offline shows connection error without leaking results.

## Verification
- Existing regression checks: all passed individually (48 cases).
- New access/entry test: passed; owner entry visible with backend denial, no dashboard RPC without permission, retry and no duplicate button.
- JavaScript syntax and ZIP integrity: checked at packaging time.
- Real Supabase owner permission and real mobile/desktop display: PENDING after Commit, Push and browser/PWA test.
- SQL folder comparison against baseline: identical.
