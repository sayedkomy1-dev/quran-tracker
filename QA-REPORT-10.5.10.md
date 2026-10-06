# QA Report — v10.5.10

## Automated checks — PASS
- Static/runtime architecture checks.
- Recitation carry-forward checks.
- Quran structure checks: 30 Juz / 60 Hizb / 240 Rub' al-Hizb.
- KFGQPC ayah→page mapping checks: 6,236 ayat / 604 pages.
- Known page anchors verified: Al-Fatiha 1:1 → p1, Al-Baqarah 2:1 → p2, 2:26 → p5, 2:286 → p49.

## Regression guards
- `أين توقفنا؟` and `اقتراح المراجعة` use explicit visible buttons rather than a chevron-only interaction.
- Exact Mushaf navigation uses local KFGQPC page metadata first and only falls back to the network API when necessary.
- Separate `آخر تسميع` and `التكليف القادم` actions prevent ambiguity in the stop panel.
- Schema remains 12 and no SQL is required.

## Manual mobile test after deployment
1. Open a student session with a previous memorization range that starts/ends in the middle of a Surah.
2. Open `أين توقفنا؟` using the visible `عرض التفاصيل` button.
3. Tap `آخر تسميع` and confirm the Mushaf opens on the page containing the final ayah of the previous recitation.
4. Tap `التكليف القادم` and confirm it opens on the page containing the first ayah of the next assignment.
5. Open `اقتراح المراجعة` using `عرض الاقتراحات` and test a Surah/quarter Mushaf action.
6. Repeat once with Internet disabled to confirm exact page navigation still works from the bundled KFGQPC ayah-page map.
