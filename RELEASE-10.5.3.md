# Quran Tracker v10.5.3 — Compact Home + Teacher Mushaf Reader

## Scope
This release is intentionally limited to the first requested stage: make the Home workspace more compact and turn the teacher Mushaf into a practical page-based reader.

## Changes
- **Today’s Students is collapsed by default** on first launch of v10.5.3.
- Added an explicit **switch-style control** to open/close Today’s Students.
- Fixed the previous collapse bug by forcing the hidden list to `display:none`.
- **Removed the PDF workflow from the Home Mushaf path.** The teacher reader now uses the web-downloaded Madani Mushaf SVG pages only.
- The Home download button:
  - shows `تنزيل المصحف Offline` when no pages are stored;
  - shows `استكمال التنزيل X/604` for a partial pack;
  - hides automatically when all 604 pages are present.
- Added a **full-screen teacher Mushaf reader** with:
  - previous/next page controls;
  - page number input;
  - left/right swipe navigation;
  - a short generated page-turn sound;
  - a decorative Mushaf-style frame;
  - online page fallback when a page is not stored;
  - automatic use of downloaded pages when available.
- On first v10.5.3 run, the obsolete locally stored full PDF and the old experimental PDF page cache are removed. Student/session data is untouched.

## Not included yet
The next stages remain separate: smarter “Where did we stop?” / review suggestions, stronger grade controls, and verified Hizb/quarter naming and boundaries.

## Database
- Schema: **12**
- No SQL migration required.
- No Supabase changes required.
