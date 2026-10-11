# v10.10.0 Stage 5.2 — Offline Fast Boot & WhatsApp Handoff

## Findings fixed

1. The teacher shell still had a deferred cross-origin Supabase `<script>` ahead of `auth.js`. On a cold offline launch the browser could wait for that CDN request before authentication code was allowed to run, leaving the splash / “checking account” gate visible until the app was restarted.
2. `beforeAppInit()` asked Supabase for a session before using the trusted-device marker. Even though the session is normally local, this was the wrong ordering for a deterministic offline boot.
3. WhatsApp handoff used only `https://wa.me/...`. With no internet the browser could not reach `wa.me`, so the installed WhatsApp app never received the prefilled message.

## Changes

- Removed the blocking Supabase CDN tag from the teacher `index.html`.
- `auth.js` now skips all Supabase work immediately when `navigator.onLine === false` and opens a previously trusted teacher locally.
- Supabase JS is loaded dynamically only for online authentication/verification, with a short timeout and trusted-device fallback.
- Online profile verification has a bounded timeout instead of being allowed to hold startup indefinitely on a broken connection.
- Android/offline WhatsApp handoff now uses `whatsapp://send?phone=...&text=...`, so the installed app can open with the message already filled while offline. Delivery itself remains WhatsApp’s responsibility and waits for connectivity.
- PWA cache generation bumped to Stage 5.2.

## Non-goals

- The application does not send WhatsApp messages in the background or bypass WhatsApp confirmation.
- A first-time teacher login still requires internet.
- If WhatsApp is not installed, an offline device cannot use the web fallback until internet returns.
