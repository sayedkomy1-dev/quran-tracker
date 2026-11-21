# IMAM beta.28-rc.6 — Quiet Lesson & Premium Educational Design System (first delivery)

The home welcome label now displays `rc.6` to verify that the updated app shell loaded.

## Scope
This is an incremental teacher-workflow candidate, **not a complete academy-wide redesign**.

- Quiet lesson visuals enabled by default; no student, session or finance mutations.
- Semantic hierarchy: primary save green, WhatsApp send outlined, secondary media/errors neutral, active lesson step green.
- Session chime **off by default**, independent opt-in from settings or lesson header; remains suppressed during Quran audio, recording, speech and the smart board.
- Compact current-student/current-step/draft display; original IDs/handlers unchanged.
- User-controlled quiet focus; it hides decorative tips only, **never form fields or feature controls**.
- Guard against rapid duplicate save/send clicks for 750 ms; retry after that remains available.
- Alt+1..Alt+4 optional session step shortcuts when keyboard focus is outside inputs/dialogs.
- No database schema modifications; no student records deleted.
- PWA versioned assets and new cache namespace included.

## Not yet verified
- Authenticated multi-role real-device end-to-end operation, WhatsApp attachment targeting, production PWA upgrade, accessibility assistive technology.
- Full UI restructuring of all academy/teacher/admin subpages remains open and should follow measured field testing.

## Acceptance
1. Open lesson. It is visually calmer, with an explicit «تركيز الحصة» button and student/step/draft status.
2. Change steps; no transition sound in the lesson unless explicitly enabled.
3. Toggle focus and verify every input and action still works, including save/send and Smart Board.
4. Click save twice within 750ms: only one action; after 750ms retry allowed.
5. Enter lesson, type into a text field; normal typing, editing and screen reader focus unaffected.
6. Set lesson navigation sound on; verify silence during recitation and voice recording.
7. Test online/offline loading with existing local data and preserve all history.
