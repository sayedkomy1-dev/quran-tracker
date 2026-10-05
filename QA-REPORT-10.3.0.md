# QA Report — v10.3.0

## Automated checks
- `npm test`: PASS
- JavaScript syntax checks: PASS
- Version / Service Worker cache consistency: PASS
- Quran engine load order: PASS
- Reciter IDs: PASS
- Flexible repeat/tutor controls: PASS
- IndexedDB offline audio hooks: PASS
- Existing auth/sync/data regression suite: PASS

## Manual tests required after deployment
1. Open a selected Quran range and confirm Uthmani/QPC text loads.
2. Test Husary, Alafasy, Minshawy, and Muaiqly playback.
3. Set ayah repeat = 3 and tutor pause = 2.5 seconds; verify timing.
4. Set full-range repeat = 2; verify the full range starts again.
5. Tap one ayah and play selected ayah only.
6. Download a short surah Offline, enable airplane mode, reopen the range, and verify local playback.
7. Delete the downloaded surah audio and verify student/session data is unchanged.

## Not changed
- Database schema: 12
- Supabase SQL: none
- Student/session/account sync model: unchanged
