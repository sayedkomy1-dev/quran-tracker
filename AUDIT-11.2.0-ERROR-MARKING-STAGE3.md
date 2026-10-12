# v11.2.0 — Interactive Error Marking Stage 3 Audit

## Scope
Stage 3 improves how correction data is reviewed and shared after the teacher has marked Quran recitation errors.

## Teacher correction card
- Added a premium PNG correction card with academy heading, student/date, totals, unresolved/corrected counts, color legend, Quran verse text, word highlights, character underlines, and a home-review summary.
- Added an in-app preview before sharing or downloading the PNG.
- Image sharing remains a separate explicit action and does not intercept the normal direct WhatsApp Save & Send workflow.

## Guardian/student portal
- Added a dedicated latest correction card above the general attention/history sections.
- The portal now receives safe structured fields required to reconstruct the marked verse view: ayah text, word index, optional character index, group/type, context, and resolved state.
- Unresolved targets can be opened directly in Tahfeez Center in Stabilization mode for focused home practice.
- Portal remains read-only.

## Data and security
- No database schema migration.
- Local app Schema remains 12.
- No SQL changes.
- Existing student/session data is not deleted or rewritten.
- New guardian snapshot fields contain Quran correction context only; phone numbers/internal IDs remain excluded from portal snapshots.

## Regression
- Existing direct WhatsApp flow remains message-first.
- Existing character-level marking, draft persistence, offline shell, family linking, guardian login and Tahfeez features remain in place.
