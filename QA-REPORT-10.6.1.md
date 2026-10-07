# QA Report — v10.6.1

## Automated checks
Run with `npm test`.

Coverage includes:
- Full static regression and JavaScript syntax checks.
- Recitation carry-forward behavior.
- Quran structure: 30 juz / 60 hizb / 240 quarter-hizb markers.
- 6,236-ayah to 604-page Mushaf map.
- Five-state assessment controls.
- Guardian Communication Center behavior.
- New 0–100 teacher score controls for main recitation and item-level review.
- Score persistence in saved sessions and drafts.
- Backup/import preservation for `assessmentScores`.
- Sectioned WhatsApp report and 10-block progress-bar generation.

## Acceptance points
- Teacher can type any integer from 0 to 100 below each assessed section.
- Values outside 0–100 are clamped safely.
- Teacher score and text grade remain separate inputs.
- Saved/edit sessions restore the score.
- Review Surahs and quarter-hizb items preserve an individual score.
- WhatsApp displays the exact percentage plus a visual bar below each scored assessment.
- Existing sessions with no percentage do not receive invented values.
- Schema remains 12; no database migration is required.
