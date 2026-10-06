# QA Report — v10.5.9

## Automated checks
- JavaScript syntax/static application checks: PASS
- Item-level recitation carry-forward checks: PASS
- Quran structure metadata checks: PASS
  - 30 Juz
  - 60 Hizb
  - 240 Rub' al-Hizb boundaries
  - 8 quarter slots per Juz

## Regression guards
- Schema remains 12.
- Google/Supabase authentication and safe account-scoped sync guards remain enabled.
- Existing save/send session controls remain available.
- Mushaf reader runtime remains versioned and cached.
- No new SQL is required.

## Manual mobile check after deployment
1. Open a student session and confirm both `أين توقفنا؟` and `اقتراح المراجعة` start closed.
2. Open `أين توقفنا؟` and verify last/next positions and last-session summary.
3. Use `فتح الموضع في المصحف` on a Quran section.
4. Open `اقتراح المراجعة` and verify due/repeat counts and quick-add actions.
5. In `مراجعة الأجزاء`, select a Juz and verify: full Juz + 2 Hizb + 8 quarters.
6. Add one quarter and verify it remains an independent review/evaluation item.
