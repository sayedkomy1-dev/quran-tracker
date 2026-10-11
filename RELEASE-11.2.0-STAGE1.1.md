# Release v11.2.0 — Interactive Error Marking — Stage 1.1 Hotfix

This hotfix is based on real Android testing of Stage 1.

### Fixed
- Persistent word-level Quran annotations across drafts, session saves, reloads, backups and sync payloads.
- Remembered correction-mode state and reading context.
- High-contrast error buttons in dark mode.
- Guardian Tahfeez active-ayah readability.

### Added
- Free teacher-entered custom error labels.
- Full ayah text stored with Quran word annotations.
- Shareable annotated PNG for guardian/WhatsApp handoff.
- Numeric typed ayah ranges in Guardian Tahfeez.
- Juz number shown beside Juz name in teacher review UI.

### Sharing note
The PWA can hand the generated PNG + report text to Android's native share sheet. Automatically choosing the exact WhatsApp guardian chat together with a binary image is reserved for the planned Android Native Bridge.

### Data
- Schema: 12 (unchanged)
- SQL: none
- Existing student/session data: untouched
