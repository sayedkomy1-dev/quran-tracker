# Offline Stage 5.4 audit

- Confirmed from Android recordings: the branded splash can remain visible for >20 seconds while offline.
- Root cause: the active service worker used network-first fetches for JS/CSS/navigation; Android can leave failed network fetches pending even when no route exists, delaying deferred scripts and the `window.load` boot hook.
- Fix: cached navigation and code assets are returned immediately; network refresh runs in the background with strict timeouts.
- App startup now uses DOMContentLoaded instead of window.load and is idempotent.
- No SQL/schema/data changes.
