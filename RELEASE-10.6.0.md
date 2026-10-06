# Quran Tracker v10.6.0 — Guardian Communication Center

This release turns the existing WhatsApp composer into a mobile-first communication center for guardians.

## What changed
- Four clear message workflows:
  - تقرير آخر حصة
  - إبلاغ بالغياب
  - تذكير بالتكليف
  - رسالة مخصصة
- Recipient scopes:
  - طلاب اليوم
  - غائبو اليوم
  - كل الطلاب
  - مجموعة محددة
  - اختيار يدوي لطالب/طلاب
- Phone validation before queue start with valid/needs-review counters and named warnings.
- Personalized preview selector so the teacher can inspect the exact message for a chosen student before opening WhatsApp.
- Session report reuses the current detailed guardian report, including motivational grades, carry-forward items, next assignment, and teacher notes.
- Assignment reminders are generated from each student's latest completed session.
- Absence messages can include the last recorded assignment for continuity.
- Custom templates still support student, guardian, teacher, and academy variables.
- Manual send queue with per-recipient progress. The app never sends in the background; WhatsApp is opened one guardian at a time for explicit final sending.
- The existing quick actions and group/student bulk actions continue to route into the new center.

## Data / backend
- Schema remains **12**.
- No SQL changes.
- No Supabase changes.
- Existing student/session/sync/Mushaf data are unchanged.
