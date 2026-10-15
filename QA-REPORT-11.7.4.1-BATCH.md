# Quran Tracker v11.7.4.1 — grouped experience release QA

## Scope (three related features)

1. **Role-aware home shortcuts**: owner, server-verified scoped supervisor, teacher. Existing Supabase RLS/RPCs remain the security boundary; UI shortcuts confer no permissions. The owner can view a privacy-limited Google guest usage report; the teacher has direct links to sessions, attendance, review, messages and reports.
2. **Explicit PWA updates**: newly installed service workers remain waiting; the `تحديث الآن` banner remains present until selected. Navigation HTML and JS/CSS cached by the active worker are no longer silently refreshed. First-time installation is automatic as usual, but updates after that require confirmation. `SKIP_WAITING` is sent ONLY by an explicit user click.
3. **Public guest Quran practice**: dedicated `guest-practice.html` with the existing approved Quran playback/recitation sources, reciter, surah/ayah range, speed, tutor, repetition, offline downloads, per-device last position and bookmark list; **no student/guardian/finance imports**. Google sign-in is optional and needs no staff approval, keeps the guest auth session in its own storage namespace. Cloud backup uses a new opt-in Google table with per-user row policies. Platform owner report can see only the Google users who chose to link an account; anonymous browsing is not personally identified.

## Deployment prerequisites and limits

- SQL: `sql/quran-guest-practice.sql` (one new, additive script), **execute only AFTER GitHub Desktop commit screenshot is reviewed and BEFORE push**. Never rerun previously used SQL scripts.
- For the guest Google OAuth callback, add `https://welivequran.online/guest-practice.html` to the authorized Redirect URLs in Supabase Auth configuration (if not already allowed). The Google provider must already be enabled. Test actual OAuth after deployment.
- Without Google: practice history and bookmarks survive app restart on the SAME browser/device, but are lost if site storage is cleared; the platform cannot know the visitor's identity. Anonymous visits are deliberately not silently recorded by the server.
- With Google: bookmarks, last position and optional nickname sync to a protected guest profile. Cloud status may fail temporarily when offline; local updates are retained for retry.
- Guardian/student login and teacher login are unchanged. Guest login does not create active teacher authorization, and does not link to any academy's student records.
- **NOT** a global multi-academy data migration, auto teacher-roster sync, guest audio speech recognition, or a tenant enrollment release. Existing academia tenants foundation remains read-only.
- Local Schema **12** unchanged; no legacy student/session records touched.

## Automated checks

- `npm test`: **PASS**, prior tests plus new `guest-role-update-batch-check.js`.
- JavaScript `node --check`: **PASS**, across all JavaScript files.
- HTML: **PASS**, unique IDs and local script/style resources in main login and guest pages.
- Archive CRC: pending ZIP-generation test; compare prior ZIP and SQL folder before delivery.
- Existing SQL: unchanged byte for byte against v11.7.4.

## Still awaiting post-push real-device tests

- Owner and supervisor/teacher quick-action visibility and access separation.
- Installed PWA update notification remains until `تحديث الآن`, and only then reloads after activation (requires a subsequent real update to verify completely).
- Guest playback, bookmarks and resume after restart, offline downloads.
- Google OAuth redirect, RLS, cross-device cloud restores, and owner report under authorized roles.

This release must **not** be declared stable until real-device and Supabase checks pass.
