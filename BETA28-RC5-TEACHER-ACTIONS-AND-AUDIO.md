# IMAM beta.28-rc.5 — Teacher Action Colors & Navigation Audio

## Source
Applied on `IMAM-beta28-RC4-FULL.zip`, keeping RC4 guardian WhatsApp and session report fixes.
This is a candidate for testing, **not** a deployed or production-certified release.

## Changes
- Color-coded teacher home shortcuts, role tools, session steps, and original session actions.
  - Green: save/start work.
  - Teal: guardian send.
  - Blue: navigation / audio share.
  - Soft amber: review / share error report.
  - Red: destructive actions remain visibly distinct.
- Original IDs and handlers remain intact: `saveSessionBtn`, `saveSendSessionBtn`, `teacherAssignmentAudioBtn`.
- Two-note, low-volume navigation chime (Web Audio, local generation; no downloaded sound file).
- Sound starts only following a user gesture; it is independent of legacy tap sound.
- Sound muted automatically during audio playback, recording, screen reader speech and Imam Smart Board session.
- Teacher has one-tap mute in the lesson step header and a persistent option + volume + preview in Settings.
- Existing preference for ordinary button taps remains **opt-in/off by default**; the new transition sound is **on by default** and can be disabled.
- Avoided a new DOM subtree observer and timed polling. A short-lived, direct-child observer only installs the lesson toggle after the existing wizard appears.
- PWA cache namespace refreshed and new CSS/JS pinned in critical offline assets.
- Original internal package version remains beta.27 to preserve migration compatibility; visible release label is rc.5.

## Validation
- `npm test`: PASS (all previous suites plus `test:beta28-rc5`).
- Runtime mock verifies default chime, user mute, tap opt-in, quiet state while a recitation/audio is active, board and recording guards, and cache linking.
- No changes to student/session tables, saved reports, auth, financial logic, audio files, or live GitHub repository.
- Browser/personal account/real device testing still required before publication.

## Manual acceptance on local or preview deployment
1. Open home/teacher workspace and check button colors and readable names.
2. Start a lesson, switch تسميع / حفظ / مراجعة / ملاحظات: short transition chime.
3. Tap 🔊 in lesson header: disabled sound until re-enabled, including after page refresh.
4. In Settings change transition sound, volume, play preview, toggle legacy tap separately.
5. Start Quran recitation and recording and try navigating: the chime must remain silent.
6. Verify core save and WhatsApp send still call original handlers (use non-production test student).
7. Confirm offline loading of updated assets after initial PWA update, including in dark mode.
