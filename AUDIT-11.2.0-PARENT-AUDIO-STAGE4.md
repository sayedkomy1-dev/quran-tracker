# v11.2.0 Stage 4 — Parent Audio & Portal Polish Audit

## Scope
- Audio help for the current memorization assignment.
- Mishary-only pronunciation assistance for correction words.
- Guardian portal quick navigation, installable PWA manifest, and Light/Dark/Kids themes.
- Compact correction review (first three ayah groups shown, expand on demand).
- Preserve direct WhatsApp text flow from Stage 1.3.

## Audio
- Export reciters are deliberately limited to Mishary Alafasy, Mahmoud Khalil Al-Husary, and Maher Al-Muaiqly.
- Export uses the original 1x verse-by-verse MP3s and concatenates the requested assignment into one MP3 without transcoding.
- Android Web Share is used for binary audio. If file sharing is unavailable, the MP3 is downloaded locally instead.
- Correction pronunciation always uses Mishary (`Alafasy_128kbps`). Word timing is attempted from a public word-timing dataset. If an exact word window is unavailable, the UI explicitly falls back to the full ayah instead of pretending the clip is word-exact.

## PWA / UX
- Added `guardian-manifest.json` with a distinct PWA id and guardian-login start URL.
- Added install handling with browser-menu fallback.
- Added Light, Dark, and Kids themes that also affect the Tahfeez reader.
- Clarified that PIN validity and authenticated session lifetime are different concepts: PIN remains valid until teacher reset/disable; the server session can still require renewal.

## Data safety
- Local Schema remains 12.
- No new SQL in this stage.
- No destructive student/session changes.
- Guardian portal remains read-only.
- Engagement analytics (who opened/practiced/how often) is intentionally deferred to Stage 4.1 because reliable teacher-visible telemetry requires additive backend tables/RPCs.
