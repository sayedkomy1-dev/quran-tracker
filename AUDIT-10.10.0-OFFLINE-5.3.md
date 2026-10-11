# v10.10.0 Stage 5.3 — Deterministic Offline Boot + WhatsApp Handoff

## Fixes
- Trusted devices now enter the local-first app immediately, without relying on Android `navigator.onLine`. Online authorization is refreshed opportunistically in the background.
- IndexedDB open/read is bounded by a 1.4s timeout; the mirrored account localStorage snapshot is used if Android leaves IDB blocked after a process restart.
- Android WhatsApp handoff uses direct `window.location` navigation to `whatsapp://` with an `intent://` fallback, avoiding the network-dependent `wa.me` route while offline.
- No SQL/schema changes; student/session storage remains unchanged.
