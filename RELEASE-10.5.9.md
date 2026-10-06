# Quran Tracker v10.5.9 — Teacher Insight & Smart Review

## Scope
This release is the next staged step after the Mushaf work. It focuses on making the session screen useful to the teacher without permanently consuming vertical space.

## Changes
- `أين توقفنا؟` is now a compact panel that starts closed by default.
- The panel shows the last listened position, next assignment, last grade/date, active paths, and saved carry-forward count.
- Relevant rows can open the associated position directly in the teacher Mushaf.
- `اقتراح المراجعة` is a separate compact panel that also starts closed by default.
- Review suggestions are prioritized by due date, overdue duration, repeat/not-heard status, and the student's previous grade.
- Suggestions provide direct actions: add to near review, far review, or juz review, and open the related Mushaf position.
- The Juz structure is now explicitly wired as `30 juz = 60 hizb = 240 rub' al-hizb`.
- Each Juz picker supports: full Juz, first/second Hizb, and 8 quarters.
- Hizb and quarter labels use their starting Quran reference and can enrich the label from the local QPC Hafs text cache.
- The Quran structure helper is now loaded and cached by the PWA service worker.

## Compatibility
- Schema remains `12`.
- No SQL or Supabase migration is required.
- No student/session data is deleted or rewritten.
- Existing legacy Juz chips remain readable through the compatibility parser.

## Deferred to the next stage
- Visual redesign of the five item-level assessment buttons (Excellent / Very Good / Good / Needs Follow-up / Repeat).
