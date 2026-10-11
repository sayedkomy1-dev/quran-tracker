# v10.10.0 Stage 5 — Offline Reliability Audit

## Scope
Deep check of the installed PWA startup path, authentication fallback, app-shell caching, local data persistence, guardian portal behavior, and Mushaf offline resources. Local Schema remains 12; SQL is unchanged.

## Findings fixed in Stage 5
1. **Service-worker registration started too late.** It ran only after authentication and local database startup. Stage 5 registers from `<head>` before the Supabase CDN/auth path, while the existing app update UI reuses the same registration.
2. **A partially precached worker could replace a good old cache.** Stage 4 tolerated individual precache failures and then deleted old caches on activation. Stage 5 requires a complete core shell and can recover missing shell files from the previous cache before activation.
3. **Supabase JS was the last CDN dependency of the teacher shell.** Stage 5 explicitly caches the cross-origin Supabase browser bundle as an opaque response and serves it from cache when offline. Trusted offline startup still works even if that optional external cache is unavailable.
4. **Trusted teacher could be sent back to login if the Supabase local session key was missing while offline.** Stage 5 restores the already-approved trusted-device profile before clearing trust when `navigator.onLine === false`.

## Existing local-first protections verified
- Students, sessions, tasks, and settings are account-scoped and stored in IndexedDB with a localStorage safety copy.
- Cloud sync is optional; local saves do not depend on a successful cloud request.
- Local Schema remains `12`.
- Stage 5 changes no SQL and no student/session record shape.

## Intentional offline limits
- **First login on a device requires internet.** Offline mode is only for a device that was previously approved online.
- **Guardian Phone + PIN login and live links require internet** because the server must validate the PIN/session. A Stage 1 static snapshot can be viewed without live server verification once its shell is cached.
- **The full 604-page Mushaf is offline only after it is downloaded.** Pages 1–2 and metadata are bundled; other pages are stored in IndexedDB by the existing Mushaf download flow.
- **Quran audio is offline only for surahs/audio explicitly downloaded** by the existing audio download flow.

## Validation
- Full `npm test` suite including new Stage 5 offline checks: PASS.
- Runtime auth simulation: approved trusted teacher starts successfully with `navigator.onLine=false` and no Supabase local session: PASS.
- JavaScript syntax check for project JS: PASS.
- `sql/` directory byte-for-byte unchanged from Stage 4: PASS.
- Browser-level service-worker emulation was attempted in the build container, but local HTTP navigation is blocked by the container's managed Chromium policy; therefore final device-level airplane-mode testing is required after deployment.
