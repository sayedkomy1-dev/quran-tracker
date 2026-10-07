# Quran Tracker v10.6.2 — Compact Guardian Report Polish

This maintenance release keeps the v10.6.1 teacher-entered percentage model unchanged and polishes only the WhatsApp report layout after real-device review.

## What changed
- Replaced the large colored emoji progress blocks with compact text squares:
  - `■■■■■■■■■□ 90/100`
- The score still uses 10 blocks and still prints the exact teacher-entered `/100` value.
- Reduced empty lines around assessment sections and shortened the visual separators.
- Compacted item-level Surah / quarter-hizb rows so the report takes less vertical space while remaining separated and readable.
- Kept the next assignment, automatic repeats, teacher notes, academy footer, and Facebook link intact.
- Existing saved percentages and old sessions are not changed.

## Data / backend
- Schema remains **12**.
- No SQL changes.
- No Supabase migration.
- No change to `assessmentScores` or item-level `reviewResults[].items[].score` storage.
