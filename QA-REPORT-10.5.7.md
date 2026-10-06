# QA Report — v10.5.7

## Automated checks
- `npm test` — PASS
- `node --check js/features/mushaf-offline.js` — PASS
- `node --check sw.js` — PASS

## Package checks
- App version: 10.5.7
- Database schema: unchanged (12)
- Supabase migration: none
- Quran page count: 604
- Bundled opening pages: 2
- Downloaded remote pages required for complete offline pack: 602
- Surah index entries: 114
- Juz index entries: 30
- Quarter markers: 240

## Migration checks
On first v10.5.7 run, only legacy Mushaf storage is cleaned:
- legacy PDF Mushaf
- old lite-page cache
- old v10.4–10.5.6 SVG page cache

Student, lesson, attendance, assignment, account-sync and audio-offline data are outside these keys and are not targeted by this cleanup.

## Manual Android test plan
1. Deploy and reload the PWA.
2. Open «مصحف المحفظ».
3. Confirm page 1 (الفاتحة) displays immediately without downloading.
4. Swipe right and confirm page 2 (بداية البقرة) displays immediately.
5. Confirm the download control appears because pages 3–604 are not yet in the new pack.
6. Start full download and confirm progress resumes if interrupted.
7. After completion confirm `604/604` and that the download button disappears.
8. Turn internet off, close/reopen the installed PWA, and browse several pages including 1, 2, 50, 300, 604.
9. Test Surah and Juz drawers offline.
10. Test day/night mode on page 1, page 2, and a regular framed page.

## Known architecture note
The original APK does not embed all 604 full-page artwork files. v10.5.7 therefore uses its authentic opening pages, border, Surah/Juz assets and structural database while regular page text remains the web-compatible SVG page source used by the PWA.
