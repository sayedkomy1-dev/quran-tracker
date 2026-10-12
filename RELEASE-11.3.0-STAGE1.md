# v11.3.0 — Smart Revision Engine · Stage 1

- New teacher "مراجعة اليوم" queue across students.
- New per-student "المراجعة الذكية" card with today/notebook tabs.
- Error locations are aggregated across historical sessions into a persistent notebook.
- Repeated-error counts and corrected/unresolved state affect review priority.
- Spaced schedule: unresolved → next day; corrected streak → 3 / 7 / 14 / 30 days.
- Guardian/student portal receives "مراجعة اليوم" and can open due ranges directly in Tahfeez stabilization mode.
- Existing Guardian Engagement logging is reused for smart-review practice opens; no Stage 4.1 SQL change required.
- Local Schema remains 12. No new SQL.
