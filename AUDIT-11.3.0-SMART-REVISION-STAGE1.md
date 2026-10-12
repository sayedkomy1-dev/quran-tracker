# Audit — v11.3.0 Smart Revision Engine · Stage 1

## Scope
- Persistent Quran error notebook derived from existing saved session annotations.
- Deterministic spaced-review schedule based on latest correction state and repeated-error history.
- Teacher home queue + per-student revision card.
- Guardian/student "مراجعة اليوم" card with one-tap practice in Tahfeez stabilization mode.

## Scheduling rule — Stage 1
- Latest unresolved location: first review is due the next day.
- Latest corrected location: review after 3 days, then 7, 14 and 30 days as consecutive corrected encounters accumulate.
- Repeated locations receive higher visual priority.
- Overdue locations remain visible until later session evidence updates their state.

## Data safety
- Local Schema stays 12.
- No new SQL and no database migration.
- No existing student/session rows are modified by the engine.
- Notebook data is computed from `recitationErrors` already stored with sessions.
- Guardian snapshots receive only a bounded revision summary; guardian access remains read-only.

## Stage boundary
Stage 1 intentionally does not add an independent "review completed" ledger. A later Smart Revision stage can add explicit teacher-confirmed review outcomes if needed; Stage 1 uses the Quran correction history as the source of truth.
