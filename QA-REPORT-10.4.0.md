# QA Report — v10.4.0

## Automated
- `npm test`: PASS
- JavaScript parse checks: PASS (included by static test)
- Version consistency: PASS
- Service Worker cache registration for `mushaf-offline.js`: PASS
- Explicit legacy override registration: PASS
- 604-page key/source guards: PASS

## Regression scope
- Schema remains 12.
- No SQL or Supabase migration required.
- Existing full PDF Mushaf import remains available.
- Student/session/account sync code not changed by this release.

## Device tests required
1. Open Mushaf page on Android.
2. Download one page and verify counter/size.
3. Turn internet off and reopen that page.
4. Download current memorization range.
5. Only after the above passes, test full 604-page download and pause/resume.

## Known external dependency
Direct in-app page download depends on CORS access to `pdf.quran.ws`. If the remote server blocks browser fetches, the existing full-PDF import path remains the fallback and the app must show a clear error instead of claiming success.
