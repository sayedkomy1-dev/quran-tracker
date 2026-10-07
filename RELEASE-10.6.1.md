# Quran Tracker v10.6.1 — Sectioned Guardian Report + Teacher Scores

This release restructures the WhatsApp session report into clear sections and adds teacher-entered mastery percentages from 0 to 100.

## What changed
- Added a manual **0–100 mastery percentage** field directly under every main recitation assessment:
  - الحفظ
  - المراجعة القريبة
  - المراجعة البعيدة
- Added a separate percentage field for every item-level Surah / quarter-hizb review result.
- Percentages are entered explicitly by the teacher; they are **not fabricated from the text grade**.
- Session drafts preserve the entered percentages before saving.
- Saved sessions preserve the percentages in `assessmentScores` and item-level `reviewResults[].items[].score`.
- Editing a saved session restores the teacher's original percentages.
- Portable backup/import preserves the new score fields.
- WhatsApp session reports are now divided into clear visual sections with separators.
- Every assessed section that has a teacher-entered score shows a 10-block progress bar plus the exact score, for example:
  - `🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜ 82/100`
- Item-level Surah / quarter reviews get their own grade and score bar.
- Next assignment, teacher notes, closing prayer, academy name and Facebook footer remain separate report sections.

## Data / backend
- Schema remains **12**.
- No SQL changes.
- No Supabase migration.
- Existing sessions without percentages remain valid; score bars appear only when the teacher has entered a percentage.
