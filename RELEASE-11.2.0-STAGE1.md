# Release v11.2.0 — Interactive Error Marking — Stage 1

This release begins the teacher-side interactive Quran correction workflow.

### Added
- Word-level tap-to-mark Quran text in the teacher Quran modal.
- Reading context selector for new memorization, talaqqin, recitation and review.
- Detailed error taxonomy for pronunciation, memorization and tajweed.
- Multiple marks on the same word.
- Visual color coding on the Quran text.
- “تم التصحيح” state that preserves the original error in history.
- Rich error entries in the session error log.
- Structured error persistence in backups and session sync payloads.

### Fixed
- Android Guardian Tahfeez blank/pale area caused by native verse button geometry on long ayat.
- Compact mobile player spacing.

### Data
- Schema: 12 (unchanged)
- SQL: none
- Existing student/session data: untouched
