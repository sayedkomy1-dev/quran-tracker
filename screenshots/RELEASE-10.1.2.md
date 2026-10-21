# We Live Quran v10.1.2 — Google Login & Access Control

## Included

- Google OAuth via Supabase.
- Owner/Pending/Blocked access states with server-enforced RLS.
- Offline trusted-device fallback after a successful active-account verification.
- Owner user-management panel.
- Authenticated encrypted cloud-sync RPC.
- Privacy and Terms pages for the production domain.

## Data

- Application Schema: **12** (unchanged).
- No student/session migration.
- Supabase server setup required once: `sql/supabase-setup.sql`.

## Security

- Browser contains only the Supabase Publishable key.
- No service-role/secret key is included.
- Anonymous users cannot directly access `app_users` or `imam_sync`.
- New Google users are pending until owner approval.
