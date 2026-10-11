# Audit — v11.2.0 Error Marking Stage 2

## Scope
Character-level Quran correction, report detail, guardian visibility and annotated image reliability.

## Compatibility
- Built from the validated Stage 1.3 package.
- Direct WhatsApp Save & Send retained.
- Stage 1.1 persistence/custom errors retained.
- Guardian Tahfeez and offline shell unchanged except cache-busting for modified assets.

## Data safety
- `recitationErrors` remains the existing session field.
- Added optional fields: `targetLevel`, `charIndex`, `charText`.
- v8 normalization sanitizes and preserves these fields.
- Local Schema remains 12.
- `sql/` is byte-for-byte unchanged from Stage 1.3.

## QA
- Full project `npm test` passes.
- New Stage 2 static regression test covers grapheme selection, char persistence, char-aware PNG, WhatsApp correction details, guardian snapshot rendering and service-worker generation.
- JavaScript syntax checks pass for all modified modules.
