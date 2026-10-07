# QA Report — v10.6.2

## Automated checks
Run with `npm test`.

Coverage includes all previous regression checks plus:
- Compact 10-square WhatsApp score bar (`■` / `□`).
- Exact teacher-entered `/100` score remains present.
- Reduced section spacing for main assessments.
- Reduced spacing between item-level Surah / quarter-hizb results.
- Existing score persistence contract remains unchanged.

## Acceptance points
- Progress bars are visibly smaller than the previous emoji-square bars in WhatsApp.
- Report sections remain easy to distinguish without large blank gaps.
- No score is recalculated or fabricated.
- Old saved percentages remain available when editing or resending a session.
- Schema remains 12; no database migration is required.
