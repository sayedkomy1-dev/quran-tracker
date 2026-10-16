# v11.7.4.4 — Auto roster sync / اختبار مزامنة كشف الطلاب التلقائية

## Source
Based on the complete, previously tested v11.7.4.3 navigation hotfix archive.

## Functionality
- After an authenticated teacher/owner starts the app **and account-local data has loaded**, schedule private roster publication in the background.
- React to the standard application `save()` persistence hook, foreground activity, and reconnect, with a 2-minute fallback check for modules that do not use the standard save hook.
- Upload **only on real changes** to roster fields or recorded attendance/absence, with a debounce window and bounded retry backoff. Requests never block local saving or PWA startup.
- Manual sync remains available and can republish on demand.
- Upload is always performed as the currently signed-in user via the previously installed `app_teacher_roster_publish` RPC. Supabase enforces the owner-scoped supervisor's read permissions; UI does not grant access.
- A complete, nonempty roster is mandatory; incomplete entries, duplicate IDs, or more than 500 students prevent publication rather than wiping or truncating the existing visible roster.
- Uploads contain `ref`, `name`, `group`, `level`, `present`, `absent`. The stable `ref` is derived by the existing portal hash function; no phone/PIN/finance/message content is sent.
- Cloud-availability requirements: teachers' devices must be logged in and connected at least once to publish local-only changes. No attempt to silently publish an offline device's newest state.

## Safeguards / compatibility
- Local Schema: **12**, unchanged.
- SQL: **none**. All existing `sql/*` files byte-for-byte identical to the v11.7.4.3 source.
- No changes to student/session storage structure, guardian login, existing direct WhatsApp, financial data, or deferred smart revision scoring.
- Offline caching version bumped; PWA update stays under the existing manual update mechanism.

## Tests
- Existing `npm test` regression suite, plus `tests/automatic-roster-sync-check.js`.
- Behavioral automatic-sync checks: initial upload, skip same snapshot, student edit, attendance edit, offline-to-online publication, prevent empty overwrite, reject nonteacher sessions, private payload.
- Syntax check for every JS file, ZIP integrity test, comparison of all old SQL file hashes, and path existence of resources used by the offline shell.
- Production confirmation pending **Commit only → Screenshot → Push → real-device owner/teacher test**.
