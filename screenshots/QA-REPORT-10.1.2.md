# QA Report — We Live Quran v10.1.2

Date: 2026-10-04

## Scope

Google OAuth/Supabase access-control release on top of v10.1.1. Application data schema remains 12.

## Implemented

- Google OAuth bootstrap with Supabase project `svtcntalwfmexthcnvqe`.
- Pre-app authentication gate before IndexedDB application initialization.
- `active / pending / blocked` access states.
- Owner bootstrap for `info.welivequran@gmail.com`.
- Owner-only user activation/block UI.
- Trusted-device offline fallback after successful active-account verification.
- Sign-out removes trusted state and local Supabase auth token.
- Cloud Sync REST RPC now sends the authenticated user's Bearer access token.
- Supabase SQL setup scopes sync records to `auth.uid()` and removes anon RPC execution.
- Privacy Policy and Terms pages for Google OAuth branding.
- Service Worker cache namespace `quran-pwa-v10.1.2` and local auth/legal assets.

## Automated checks

- `npm test`: **PASS** — `Static checks passed for We Live Quran v10.1.2`.
- `node --check auth.js`: **PASS**.
- `node --check app.js`: **PASS**.
- `node --check v8.js`: **PASS**.
- `node --check v9.js`: **PASS**.
- `node --check v10.js`: **PASS**.
- `node --check sw.js`: **PASS**.
- Local HTTP asset availability for `/`, `/auth.js`, `/auth.css`, `/privacy.html`, `/terms.html`, `/sql/supabase-setup.sql`: **PASS**.

## Security guards covered by static regression tests

- Browser code contains only the Supabase Publishable key, not a Secret/service-role key.
- Auth gate runs before `initDB()`.
- Non-active accounts cannot initialize the application UI/data layer.
- `app_users` has RLS policy definitions and owner-only update policy.
- New non-owner Google accounts default to `pending`.
- Owner email defaults to `owner + active`.
- Cloud Sync requires an authenticated Bearer token.
- Sync RPC execute permission is granted to `authenticated`, not `anon`.
- Sync row access is scoped to `auth.uid()`.

## NOT TESTED yet

These require the user's live Supabase/project/domain and are intentionally not marked PASS:

- Executing `sql/supabase-setup.sql` on the production Supabase database.
- Real Google OAuth redirect from `https://welivequran.online`.
- First owner login and automatic `app_users` creation.
- Pending-account login and owner approval cycle.
- Blocked-account enforcement against the live backend.
- Trusted-device offline launch in a real browser/PWA after live login.
- Production Cloud Sync against authenticated RPC.
- Android PWA behavior.

## Release gate

Do not call v10.1.2 production-auth verified until the SQL setup is executed, the files are deployed, and the live OAuth scenarios above are tested.
