# Quran Tracker v10.5.11 — Prominent Recitation Assessment

This release focuses on the teacher's assessment step during a session.

## What changed
- Replaced the small four-choice grade row with five prominent controls:
  - ممتاز ⭐⭐⭐
  - جيد جدًا ⭐⭐
  - جيد ⭐
  - يحتاج متابعة 😕
  - إعادة 🔄
- The layout is mobile-first: three success grades on the first row and two attention/repeat actions on the second row.
- The selected result is visually obvious and exposes `aria-pressed` state.
- `إعادة` now has a distinct meaning: it automatically copies the same previous assignment into the upcoming session fields.
- `يحتاج متابعة` remains a weak assessment without automatic advancement; the teacher can explicitly repeat the same task.
- Passing results keep the existing smart-continuation behavior.
- Review-by-surah and review-by-quarter use the same five-button visual language.
- A repeated/weak new-memorization assessment is no longer treated as verified memorization progress.
- Portable backup/import now preserves the explicit `إعادة` value.

## Data / backend
- Schema remains **12**.
- No SQL changes.
- No Supabase changes.
- Existing students, sessions, sync, Mushaf pages, and account data are unchanged.
