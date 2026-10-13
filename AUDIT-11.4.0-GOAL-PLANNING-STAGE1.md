# Audit — v11.4.0 Goals & Memorization Planning · Stage 1

## Scope
- Per-student long-term Quran memorization goal.
- Goal can be a full Juz or a Surah/ayah range.
- Start date, target date and sessions/week define the pacing plan.
- Actual progress is calculated from existing attended-session Quran memorization evidence.
- Automatic expected-progress comparison: ahead / on plan / behind / overdue / complete.
- Automatic suggested ayat-per-session and next contiguous new-memorization range.
- One-click teacher action copies the next suggested range into the session's new-memorization section.
- 25/50/75/100% milestone display.
- Guardian portal gets a read-only plan summary and one-tap practice for the next suggested range.

## Data model
- Adds optional `student.memorizationGoal` only.
- Local Schema remains 12.
- No SQL or backend migration.
- Existing student/session rows are not deleted or rewritten.
- Portable import sanitizer preserves and validates the optional goal object.

## Quran target calculation
- Surah targets use the existing 114-surah metadata in the app.
- Juz boundaries use the standard 30 Juz start ayah positions already aligned with the bundled KFGQPC Mushaf metadata.
- Completed verses are unique ayahs evidenced by attended sessions (`actualRecitation.new`, with assessed legacy new-memorization fallback).

## Stage boundary
The explicit Smart Revision outcome buttons (mastered / needs stabilization / erred again) requested in the proposed v11.3 Stage 2 were intentionally deferred by product decision. v11.4 proceeds without adding that ledger.

## Completion QA extension
- Node-level behavioral test validates the full 6,236 ayat corpus, Juz 1 start/end, a complete multi-Juz range, multi-surah custom range, unique approved recitation progress, rejection of weak/absent grade, real weekly days, and explicit approval.
- Existing regression suite retained in CI; only historical release-version expectations are advanced from 11.2.0 to 11.4.0.
- Guardian functionality already bundled is preserved without additional SQL or portal feature changes.
