# IMAM Beta28 RC13 — Storage Reliability, Audio Library & Portal Repairs

**Build label:** `IMAM Beta28 RC13 – Storage Reliability`  
**Source application version:** `11.12.1-beta.27`  
**Local Schema:** `12` (unchanged)  
**Release type:** candidate build for controlled device acceptance; not yet field-certified on Android.

## Scope

RC13 is built on the second uploaded archive (`quran-tracker-main.zip`). The original archive was preserved separately. No SQL migration was added and no student, lesson, attendance, review, error, payment, or guardian records were intentionally deleted or rewritten.

## Implemented

### 1. Storage and cache protection

- Storage governor reports browser quota, persistence status, Cache Storage entries, IndexedDB databases, and approximate LocalStorage/SessionStorage size on page load. Per-reciter Quran-library sizes are scanned only when the teacher explicitly refreshes the settings manager, avoiding a costly six-reader verse scan on every mobile page load.
- Audio downloads stop before writing more verses when the available browser quota falls below the safety headroom or the configured usage threshold is reached. Completed verses remain stored and can be resumed later.
- A critical browser-quota condition triggers one automatic safe-cache-clean attempt per tab, but only after the active Service Worker identifies itself as RC13. An older worker is refused; no old worker is allowed to clean a newer shell.
- Service Worker cleanup verifies the complete current core and critical shell before deleting previous `quran-pwa-*` caches.
- Runtime cache quota recovery trims unpinned runtime responses progressively (40 entries, then all unpinned runtime entries). Pinned application shell files are not removed. Quran audio is in a separate store and is not part of this cleanup.
- LocalStorage save compaction removes only exact duplicate account mirrors after a complete account-scoped atomic snapshot has been verified. Unique values and unrelated keys are retained. The global safety snapshot remains a fallback only when no complete atomic snapshot exists.
- Historical root CSS files that had no active references were removed. Their historical source is retained in the archive; the screenshot/reference images remain in `screenshots/`.

### 2. Quran audio library and assignment sharing

- The full audio-library manager is available in the teacher settings only.
- Six reciter profiles are supported: Mishary Alafasy, Mahmoud Khalil Al-Husary (Murattal and Muallim), Muhammad Siddiq Al-Minshawi (Murattal and Muallim), and Maher Al-Muaiqly.
- The library stores verse-level MP3 data in its dedicated IndexedDB database. Downloads can be paused, resumed, and removed per reader. A user-requested reader deletion also removes that reader's legacy audio-cache entries only.
- When an assignment MP3 is prepared, the exporter reads the selected reader's local verse library first. If the device is offline and a required verse is missing, it reports that the verse is not stored instead of waiting for a remote request.
- Mid-surah assignment exports prepend the standalone Al-Fatiha opening verse as Basmala except for At-Tawbah, following the existing Quran assignment rule.
- The prepared verses are combined into one MP3 file without inserting deliberate pauses. MP3 frame concatenation does not guarantee removal of all encoder padding or silence already present inside the source recordings.
- The prepared file is shared through Android's native share sheet. The teacher chooses WhatsApp and the guardian manually. The app does not claim it can attach an MP3 to a specific `wa.me` chat, and it does not save an extra exported copy to Downloads.
- The existing text-message and text-assignment WhatsApp flow remains direct-to-guardian-chat with the message prepared for teacher review and final send inside WhatsApp.

### 3. Guardian/student portal

- Removed the teacher-rating card and rating navigation from the guardian/student portal UI. Historical rating data and the supervisor/teacher rating system were not deleted.
- Student mode retains personal learning KPIs and the goal/progress card while hiding family-only finance and message areas.
- Improved portal visual hierarchy and mobile card presentation.
- The mode selector remembers the selected presentation mode locally. It remains a presentation preference, not a separate security boundary.
- Audio-library administration is no longer exposed in the guardian or public practice pages; those pages can still use the shared local audio reader/player.

### 4. Public practice portal naming

- Added the standalone route `maqraa.html` under the name **مقرأة الإمام**.
- Updated the academy, login, and portal navigation links to point to the new route.
- Kept `guest-practice.html` as a backward-compatible route.

### 5. Lesson/session and archive safety

- Session data construction reconciles the visible enabled Quran section ranges with the saved session payload, while preserving existing grade and note metadata. This addresses cases where the UI fields were complete but the legacy builder omitted the range.
- Missing-field focus now tries the matching grade/range controls and reports when a target cannot be located. Repeated clicks while the review dialog is open no longer fail silently.
- WhatsApp send actions now use a short in-progress lock and visible button state. A failed save prevents WhatsApp handoff; the existing direct-chat behavior remains unchanged.
- Archiving or pausing a student now compensates for guardian-access revocation if the local save fails. Partial batch revocation attempts restore already-affected guardian access where possible and report when compensation fails.
- Student records continue to be archived, not permanently deleted. Session and historical learning records are retained.

## Verification completed

- `npm test` — completed successfully after RC13 updates.
- `npm run test:beta28-rc13` — passed.
- JavaScript syntax scan — 223 files checked, 0 syntax failures.
- HTML local-reference scan — 11 HTML pages checked, 0 missing local references.
- Service Worker shell scan — `CRITICAL_FRESH_SHELL` 125 entries, `APP_SHELL` 159 entries, `CORE_SHELL` 47 entries; 0 missing local assets.
- RC13-specific tests cover storage compaction, six-reciter alignment, offline verse lookup, single-file share flow, portal UI isolation, `maqraa.html`, session range reconciliation, and reversible archive compensation.

## Known limitations / required real-device acceptance

1. Automated tests do not simulate a real Android device running out of physical storage. Test quota thresholds and cache-clean behavior on the actual phone before using full-Mushaf downloads.
2. Browser storage estimates are approximate. The browser may refuse persistent storage, and the app cannot guarantee the operating system will never evict site data.
3. The MP3 export concatenates encoded frames; it inserts no deliberate inter-ayah pause, but it is not a decode/re-encode gapless mastering process. Source-encoded padding may remain.
4. The native Android share sheet must be tested on the target phone with WhatsApp installed. The teacher must choose WhatsApp and the guardian in the share sheet.
5. The full audio library can be large. Download one reader first, verify free space, then add other readers as needed. Do not start all six full-Mushaf downloads at once on a low-storage device.
6. The portal mode switch is a UI mode only. It does not replace server-side role separation or authentication.
7. The app's internal package/version fields remain `11.12.1-beta.27`; RC13 is a build/cache stage label. Local Schema remains 12.

## Installation guidance

Use this as a separate candidate folder. Do not overwrite the current live project or install it over the only working backup. Deploy the full directory so that `sw.js`, `maqraa.html`, `css/platform/rc13-portal-learning.css`, and all RC13 versioned scripts are uploaded together. Then perform the Android acceptance checklist before promoting it to production.
