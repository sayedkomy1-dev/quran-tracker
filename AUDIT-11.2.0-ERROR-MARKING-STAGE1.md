# Audit — v11.2.0 Interactive Recitation & Error Marking — Stage 1

## Scope
This stage introduces word-level Quran correction inside the teacher session workflow while keeping the existing local schema version at 12.

## Teacher workflow
- Open the Quran text from the session screen.
- Enable **وضع التصحيح**.
- Choose the reading context:
  - الحفظ الجديد — قراءة الطالب
  - التلقين — ترديد خلف الشيخ
  - التسميع
  - المراجعة
- Tap a Quran word.
- Choose one or more error types.
- The word receives a visual marker immediately.
- A recorded error can be marked **تم التصحيح** without deleting the historical event.
- A mark may also be deleted when it was entered by mistake.

## Error taxonomy — Stage 1
Word/letter and pronunciation: تشكيل، نطق حرف، حذف حرف، زيادة حرف، كلمة خاطئة.

Memorization/fluency: نسيان، تردد، تلقين.

Tajweed: مد، غنة، إخفاء، إدغام، إقلاب، قلقلة، وقف/ابتداء، حكم تجويدي آخر.

Legacy quick error buttons remain supported.

## Data model
Structured Quran errors are stored additively inside the existing `session.recitationErrors` array. A structured record can contain:
- `id`
- `type`
- `at`
- `source = quran-word`
- `mode`
- `surah`, `surahId`, `ayah`
- `wordIndex`, `word`
- `resolved`, `resolvedAt`

Old `{type, at}` records continue to work unchanged.

## Safety
- No student or session deletion.
- No SQL migration.
- No Supabase schema change.
- Local `SCHEMA_VERSION` remains 12.
- Backup/import sanitization was extended so the new structured fields survive backup round-trips.
- Cloud payload already syncs complete session JSON, so the additive fields remain part of the session object.

## Guardian Tahfeez mobile fix
The screenshots supplied from Android showed an anomalous pale/blank block after long Quran text. The verse interaction wrapper used a native `<button>` element. Stage 1 replaces that wrapper with an accessible non-native inline element (`role=button`, keyboard support) and explicitly removes native control geometry. The sticky player is also slightly more compact on small screens.

## Deferred to Stage 2
- Letter-level selection inside a word.
- Per-error notes and richer correction details.
- Generating the marked Quran image for guardian/student.
- Parent-visible error map.
- Aggregate repeated-word/error heatmap.

## Verification
- Existing regression suite: PASS.
- Interactive error-marking checks: PASS.
- Tahfeez mobile geometry regression check: PASS.
- JS syntax checks: PASS.
