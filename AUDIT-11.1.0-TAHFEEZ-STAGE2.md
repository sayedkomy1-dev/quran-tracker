# Audit — v11.1.0 Tahfeez Center Stage 2

## Scope
Guided home-practice layer on top of Stage 1 without changing student/session schema.

## Added
- Four practice presets: listening, talaqqin, stabilization, self-test.
- Focus card for the active ayah.
- Talaqqin repetition countdown.
- Session progress indicator.
- Self-test hide/reveal mode.
- Per-student local “continue last position” state.
- Test-mode previous/next navigation does not automatically reveal the answer by playing audio.

## Data safety
- Local Schema remains 12.
- No SQL migration.
- No deletion or mutation of student/session records.
- Existing Guardian Portal remains read-only.

## Offline
Existing downloaded audio and Stage 5.5 offline shell are preserved. Resume state is stored locally on the current device.
