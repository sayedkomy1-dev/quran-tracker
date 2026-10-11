# Stage 5.1 Offline Shell Hotfix

Observed on device after Stage 5: HTML/JS loaded offline while external stylesheets were unavailable, producing an unstyled UI; the same launch also rendered an empty local account.

Fixes:
- service worker stores both versioned and canonical aliases for same-origin shell assets; offline lookup tries exact and ignoreSearch matches across current/older caches;
- current code assets are network-first but fall back to canonical cache aliases;
- a same-account last-good local snapshot is maintained and is used only during a genuinely offline boot when the normal account snapshot is absent/empty;
- empty offline boots cannot overwrite an existing non-empty safety snapshot;
- tiny inline critical CSS keeps the UI usable even if all external CSS requests fail.

Schema remains 12. SQL unchanged.
