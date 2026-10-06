# Quran Tracker v10.5.10 — Exact Mushaf Position + Explicit Insight Buttons

## What changed
- Fixed `فتح الموضع في المصحف` so it resolves the exact Quran page for the relevant ayah instead of opening only the beginning of the Surah.
- Added a bundled KFGQPC ayah→page map extracted from the Madinah Mushaf app database: 6,236 Hafs ayat mapped across 604 pages. This makes page resolution accurate even Offline.
- In `أين توقفنا؟`, the teacher now gets two unambiguous Mushaf actions when available:
  - `آخر تسميع` opens the page containing the last ayah reached.
  - `التكليف القادم` opens the page containing the first ayah of the next assignment.
- Juz-quarter links resolve directly from the local KFGQPC quarter metadata.
- Replaced the arrow-style disclosure controls for `أين توقفنا؟` and `اقتراح المراجعة` with clear, visible action buttons:
  - `عرض التفاصيل` / `إغلاق`
  - `عرض الاقتراحات` / `إغلاق`
- Panels still start closed by default to preserve mobile vertical space.

## Data / compatibility
- Schema remains `12`.
- No SQL or Supabase migration is required.
- No student, session, sync, or Mushaf page-pack data is deleted.
- The new `assets/kfgqpc/ayah-page-map.json` is read-only Quran navigation metadata and is precached for Offline use.
