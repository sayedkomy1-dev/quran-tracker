# v11.1.0 — Quran Learning & Home Tahfeez Center · Stage 1

This stage adds the first complete guardian/student home-Tahfeez experience while preserving the current teacher, session, guardian-auth and offline architecture.

## Guardian / student experience
- New **التحفيظ** entry inside the guardian/student portal.
- Select any of the 114 surahs and an ayah range.
- Six reciter choices, including Husary/Minshawy Murattal and Muallim modes.
- Repeat the full selected range, one selected ayah, or a smaller sub-range.
- Configurable number of repetitions.
- Talaqqin mode: repeat each ayah a configurable number of times, then wait a configurable period for the learner to repeat.
- Full player controls: play/pause, stop, previous/next ayah, ±10-second seek, progress seek, speed, volume and mute.
- Quran text from QPC Hafs with a bounded local text cache.
- Optional offline audio download for the selected target or the entire current surah.
- Current teacher new-memorization assignment is included in new portal snapshots and can be loaded directly into the player.
- Android/browser Back closes the Tahfeez Center before leaving the portal.

## Data safety
- Local Schema remains **12**.
- No new SQL and no changes to existing SQL files.
- No student/session migration.
- The Tahfeez player is read-only with respect to academy records; only player preferences, Quran text cache and optional audio downloads are stored on the guardian device.

## Compatibility
- Existing Snapshot, Live Link and Phone + PIN guardian access remain supported.
- Existing v11 Premium UI Stage 2 remains intact.
- Offline teacher startup and Stage 5.5 WhatsApp behavior remain intact.
