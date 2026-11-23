# IMAM Beta28 RC12 — Storage Reliability

## Source and scope

- Base: the uploaded second reference build `quran-tracker-main.zip` (internal application version remains `11.12.1-beta.27`).
- Candidate label: `IMAM Beta28 RC12 — Storage Reliability`.
- This is a focused storage/cache reliability stage. It does not change the local data schema, student records, lesson records, guardian access model, or WhatsApp message flow.

## Implemented

1. Added `js/features/storage-governor.js`.
   - Reads `navigator.storage.estimate()` and `navigator.storage.persisted()` when supported.
   - Shows usage/quota, available space, persistent-storage status, cache names/counts, IndexedDB database names, and approximate local/session storage sizes.
   - Displays a critical storage warning once per tab when usage reaches 92% or more.
   - Adds a Settings card with refresh, safe cleanup, and persistent-storage request controls.
   - Does not delete databases, records, audio, or caches directly.

2. Added a Service Worker safe-clean message.
   - Validates every `CORE_SHELL` resource in the active cache before deleting any old application cache.
   - Removes only obsolete caches whose names start with `quran-pwa-`, excluding the current active cache.
   - Trims only unpinned runtime entries in the current application cache, keeping at most 80 runtime entries in FIFO order.
   - Never deletes `imam-quran-audio-library-v1`, `imam-guardian-tahfeez-audio-v1`, `QuranApp`, unknown caches, or local/session storage.
   - If the current offline shell is incomplete, cleanup is refused without deleting old caches.

3. Added quota-aware runtime cache writes.
   - When a runtime Cache API write fails with a quota error, the worker first trims older unpinned runtime entries and retries once.
   - Essential app shell assets remain pinned and are never selected for runtime eviction.

4. Added an audio-download headroom guard.
   - Checks estimated free space before a download and every eight saved ayahs.
   - Pauses safely when free space falls below 32 MiB or estimated usage reaches 96%.
   - If IndexedDB throws a quota error, the download stops and reports that completed ayahs remain saved for later continuation.
   - No audio files are automatically deleted.

5. Integrated the storage governor into the teacher, guardian, and guest-practice shells so the audio download guard is available wherever the audio library is loaded. The management UI itself appears in teacher Settings only.

## Safety boundaries

- No IndexedDB database is deleted or recreated.
- No `QuranApp` object store is cleared.
- No student, lesson, attendance, task, finance, error, draft, or voice-note data is deleted.
- No Quran audio cache or downloaded recitation is automatically deleted.
- The safe cleanup operation is limited to old app-shell caches and unpinned runtime cache entries.
- Browser persistent-storage permission is advisory and controlled by the browser; the app cannot guarantee that a browser/device will never evict origin storage.

## Tests

Focused RC12 suite:

- `tests/storage-governor-check.js`
- `tests/storage-governor-sw-check.js`
- Existing offline reliability and safety snapshot tests
- Existing Beta28 media sharing tests
- Existing teacher workspace/cache pinning test

Result: all focused RC12 tests passed.

The complete `npm test` command was also attempted. It stops at the pre-existing `version-debt-beta11-check` because the repository still contains `styles.css` in the runtime root. That check predates RC12 and is unrelated to the storage changes. The full suite therefore cannot be reported as green from this run.

## Not yet verified on real devices

- Actual Android Chrome/PWA quota behavior under low free disk space.
- Whether `navigator.storage.persist()` is granted on the target phone.
- Real browser cache usage after a long-running session.
- Large full-Quran downloads on devices with constrained storage.

These require the next on-device acceptance test. Do not treat passing Node tests as proof of real-device quota behavior.
