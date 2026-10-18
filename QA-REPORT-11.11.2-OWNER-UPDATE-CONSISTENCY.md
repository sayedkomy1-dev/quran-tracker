# 11.11.2 — Owner/Teacher Version Consistency Hotfix

## Trigger and evidence
- In real owner browser settings, the app reported 11.9.0, while teacher reported 11.11.1. Local schema stayed 12 for both.
- The archive's 11.11.1 implementation was versioned consistently, but SW `install` accepted old cached core HTML/JS on fetch errors, and the `./` shell path could retain stale HTML.
- This is a **confirmed implementation risk** and a plausible explanation, but the affected owner's browser/cache has not been inspected. Deployment/host serving problems remain possible.

## Maintenance
1. New SW installation first fetches and checks **current** index, app.js, runtime.js, and bootstrap.js; if any of these is unreachable or stale, installation rejects, leaving the previous active worker/cache untouched.
2. Precache `/` alias only from the verified current index file, avoiding a root vs index version split.
3. Register SW with `updateViaCache: 'none'` to bypass intermediate HTTP caching during SW update checks.
4. Align current release markers in VERSION, package.json, manifest.json, index.html, SW, runtime, and versioned core JS URLs.
5. No data reset, no automatic skipWaiting, no destructive migration, no SQL changes. Update remains user-approved.

## QA results
- Regression suite: all 67 checks pass (66 legacy + new installation consistency check).
- New test simulates an old SW cache and an old HTML from the origin: new install rejects, previous cache remains.
- New test simulates network failure for runtime.js: rejects and preserves old cache.
- New test simulates a fully current origin: new install succeeds and both `/` and `/index.html` return version 11.11.2.
- JavaScript parse and ZIP integrity checked separately as part of packaging.
- SQL folder unchanged byte-for-byte vs 11.11.1; Local Schema remains 12.

## Not yet verified
- Real owner's installed browser/service worker update, teacher account and offline mobile behavior after push. User must test on actual devices.
- The issue can persist if the owner browser never checks for or activates a waiting SW, or if the deployment serves stale files. Do not delete site data or unregister SW as a first diagnostic step; backup owner data first.

## Release procedure
- Preserve `.git` and replace files from the full ZIP.
- **Commit only** and send screenshot for review; no push yet.
- No SQL. After commit approval, push and test owner version, navigation and backups.
