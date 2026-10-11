# v11.2.0 — Interactive Error Marking Stage 2

Stage 2 extends structured Quran correction from word level to precise letter/grapheme targeting while keeping the established direct WhatsApp report flow.

## Delivered
- Tap a Quran word, then target the whole word or a specific Arabic grapheme/letter.
- Direct tap on a rendered letter preselects that letter; whole-word correction remains available from the sheet.
- Character-level targets persist in drafts, saved sessions, backup/import and cloud payloads.
- Existing correction taxonomy, custom teacher labels, context and resolved state remain unchanged.
- Quran text paints word-level marks as before and adds a precise underline for letter-level marks.
- Annotated PNG generation now renders letter-level underlines and uses `canvas.toBlob()` first for better Android reliability.
- WhatsApp text reports include detailed Quran correction locations, including the exact letter when available.
- Guardian/student portal recent sessions show correction locations and resolved state.
- Direct `حفظ وإرسال لولي الأمر` WhatsApp behavior from Stage 1.3 is preserved.

## Data / backend
- Local Schema remains 12.
- No SQL migration.
- Existing students and sessions are not deleted or rewritten.
- New annotation fields are additive inside existing `recitationErrors` records.
