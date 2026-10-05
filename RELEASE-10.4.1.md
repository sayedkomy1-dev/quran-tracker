# We Live Quran v10.4.1 — Mushaf Mobile Reader Fix

## What changed
- Replaced page-level PDF embeds with versioned Hafs Madani Mushaf SVG pages from the Quran.ws CDN.
- Fixed Android/Chrome showing a black PDF placeholder with an external “Open” button instead of the Mushaf page.
- The new Mushaf reader is now the primary UI; the old full-PDF workflow is kept only as a cleanup/legacy option.
- New offline pages are gzip-compressed before IndexedDB storage when the browser supports CompressionStream.
- Added safe cleanup actions for the old ~220 MB full PDF and the experimental v10.4.0 per-page PDF cache.
- No student/session/auth/sync schema changes.

## Upgrade safety
- Existing student data is untouched.
- Existing legacy PDF is not deleted automatically.
- Verify one SVG page first, then optionally delete the old PDF to free device storage.
