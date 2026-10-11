# Audit — v11.2.0 Interactive Error Marking Stage 1.1

## Real-device issues addressed
1. Active Tahfeez ayah was low-contrast in dark mode because white text inherited over a pale mint `playing` background. The active highlight now lives on the inner ayah text with explicit dark-green-on-mint contrast.
2. Quran word annotations disappeared after restart. Root cause: v10 installs final `captureDraft`, `applyDraft`, and `buildSesData` compatibility overrides after the v8 error extensions. Stage 1.1 installs a final annotation bridge over the active v10 functions and immediately saves draft changes.
3. Preset error buttons were unreadable under Android dark mode. Explicit high-contrast foreground/background pairs now override system dark styling.
4. Correction mode was runtime-only. Its enabled state, context, and recent custom labels are now persisted in localStorage.
5. Teachers can now enter a free custom error label (up to 60 characters); Quran-word sanitizer/backup handling preserves it as `group: custom`.
6. Word annotation records now preserve the complete ayah text (`ayahText`) for reconstruction.
7. Annotated Quran error PNGs can be shared through the Web Share API; Android can choose WhatsApp from the native share sheet. If file sharing is unavailable the PNG is downloaded and the normal WhatsApp text flow remains available.
8. Guardian Tahfeez from/to and repeat-target ayah controls are numeric typed inputs with Quran-range clamping.
9. Teacher Juz labels now display the Juz number in parentheses without changing stored Juz values.

## Data safety
- Local Schema: 12 (unchanged)
- SQL migrations: none
- `sql/` directory: identical to Stage 1
- Student/session collections: no destructive migration
- New fields are additive inside existing `recitationErrors` records (`group`, `ayahText`).

## Verification
- Node syntax checks: app.js, v8.js, v10.js, teacher-error-marking.js, guardian-tahfeez.js, sw.js
- Full `npm test` regression suite including Stage 1.1 hotfix checks
- ZIP integrity validation
