# QA Report — v10.6.0

## Automated checks
Run with `npm test`.

Coverage includes:
- Full static regression suite and JavaScript syntax.
- Recitation carry-forward behavior.
- Quran structure: 30 juz / 60 hizb / 240 quarter-hizb markers.
- 6,236-ayah to 604-page Mushaf map.
- Five-state recitation assessment controls.
- Guardian Communication Center: four message modes, today/absent/group scopes, phone validation, personalized preview, and manual WhatsApp handoff.

## Acceptance points
- Center opens from the existing communication shortcuts.
- No recipient is preselected by default, reducing accidental bulk sends.
- Invalid WhatsApp numbers are visibly flagged and excluded from the send queue.
- Teachers can target today's students, today's absentees, all active students, a group, or hand-picked students.
- Report mode uses the existing detailed guardian report per student.
- Absence and assignment reminder modes are generated per student from current data.
- Custom message preview substitutes student/guardian details before sending.
- Queue opens WhatsApp one recipient at a time and requires explicit user action for final send.
- Schema remains 12; no database migration is required.
