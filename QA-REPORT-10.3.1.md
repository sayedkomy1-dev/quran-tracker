# QA Report — v10.3.1

## Automated checks
- `npm test`: PASS
- `node --check js/features/quran-engine.js`: PASS
- `node --check app.js`: PASS
- `node --check v8.js`: PASS
- `node --check v9.js`: PASS
- `node --check v10.js`: PASS
- `node --check auth.js`: PASS
- `node --check sync-core.js`: PASS
- `node --check sw.js`: PASS

## Regression intent
- Quran text remains QPC Hafs and existing audio/offline engine remains intact.
- Schema stays at 12.
- Auth, account ownership and safe multi-device sync logic are untouched.
- UI-only Quran preference changes no longer call the heavy v8 `save()`/auto-sync path synchronously.

## Manual test required after deploy
1. Open Quran text on a phone and confirm at least ~1/3 of viewport is allocated to the Quran text.
2. Switch between full-range and single-ayah modes; interaction should feel immediate.
3. Tap several ayat; selected highlight should move instantly.
4. Play range and single ayah.
5. Expand Offline section and confirm download/delete actions still work.
