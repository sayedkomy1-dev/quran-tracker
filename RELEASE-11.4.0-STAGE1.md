# v11.4.0 — Goals & Memorization Planning · Stage 1

- Long-term goal per student: Juz or Surah/ayah range.
- Configurable plan start, deadline and sessions per week.
- Automatic total/completed/remaining ayah counts.
- Actual vs expected progress with ahead/on-plan/behind status.
- Automatic recommended ayat per remaining session.
- Automatic next-session memorization suggestion.
- One click applies the suggestion to the teacher's new-memorization section.
- 25/50/75/100% milestones.
- Guardian read-only goal card with next practice shortcut into Tahfeez tutor mode.
- Goal is preserved in backup import/export and normal cloud student payloads.
- No SQL. Local Schema remains 12.

## Stage 1 completion on uploaded ZIP (2026-10-13)
- Added full Quran, contiguous multiple-Juz targets and custom cross-surah endpoints in addition to the existing one-surah / one-Juz goals.
- Added optional study weekdays and a teacher-selected approximate ayat-per-session pace.
- Calculation now counts each successful **graded actual new recitation** verse only once. New homework / failed grading never increases completion.
- Schedule-aware remaining sessions, suggested homework range, pacing, status, and projected finish date.
- Teacher home summary and student profile plan now show measured figures.
- Teacher approval prompt required before placing a suggested range in a session **draft**; no automatic save or WhatsApp send.
- Old goal format (`targetType: surah/juz`) stays readable; importer preserves optional student memorizationGoal.
- No SQL changes, no reset, Local Schema = 12. Service Worker cache bumped; 11.3 review-outcome assessment remains deferred.
