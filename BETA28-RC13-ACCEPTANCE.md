# Beta28 RC13 — Android acceptance checklist

Run on a test guardian/student record first. Do not use a production student's account for destructive tests.

## Storage and cache
- [ ] Open Settings → Storage manager; confirm quota, database, cache and LocalStorage details render. Press the storage refresh button and confirm per-reader audio-library sizes appear.
- [ ] Confirm the current Service Worker reports RC13 before using safe cleanup.
- [ ] Run safe cache cleanup; confirm Quran audio and student/session records remain.
- [ ] Download a small verse range; stop it; resume it; verify completed verses are not downloaded again.
- [ ] Simulate offline mode and play already downloaded verses.
- [ ] Try an offline verse that is not stored; confirm the app gives a clear message instead of hanging.
- [ ] With a safe test device, approach low storage; confirm download pauses before quota exhaustion and leaves completed verses intact.

## Audio assignment
- [ ] Download one reader and a small test range.
- [ ] Prepare a new assignment MP3 while online; verify correct surah, verse range and selected reader.
- [ ] Repeat with the device offline; confirm the local library is used.
- [ ] Change the surah/range/reader while preparing; confirm the old file is not shared.
- [ ] Share the file; choose WhatsApp and the correct guardian manually; verify one combined MP3 is attached.
- [ ] Confirm no extra exported file appears in Downloads.
- [ ] Verify At-Tawbah does not receive an added Basmala; verify a mid-surah assignment in another surah does.

## Guardian/student portal
- [ ] Open the guardian portal; confirm teacher-rating card and navigation are absent.
- [ ] Switch to student mode; confirm progress KPIs and goal card remain visible while finance/messages are hidden.
- [ ] Switch back to guardian mode; confirm family follow-up and messaging return.
- [ ] Test the tahfeez player: select a middle ayah, play, pause, resume, previous, next, repeat, change reader, and change range.
- [ ] Confirm an ended verse advances once only; no stale audio event restarts an earlier verse.

## Session save and WhatsApp
- [ ] Complete a normal lesson and save it.
- [ ] Send a guardian report; confirm WhatsApp opens directly on the guardian number with prepared text.
- [ ] Confirm final send remains manual inside WhatsApp.
- [ ] Test an intentionally incomplete lesson; confirm the warning names the exact missing field and focuses it.
- [ ] Fill the field; confirm the false missing warning disappears.
- [ ] Simulate storage failure on a test profile; confirm no WhatsApp handoff occurs and the draft remains.

## Archive and history
- [ ] Archive a test student; confirm guardian access is revoked and student history remains.
- [ ] Reactivate the test student; confirm access restoration and credentials flow.
- [ ] Simulate local-save failure after remote guardian revocation; confirm rollback/compensation is reported and verified.

## Public route
- [ ] Open `/maqraa.html` directly on mobile and desktop.
- [ ] Open the old `/guest-practice.html` route and confirm backward compatibility.
- [ ] Verify `/maqraa.html` loads offline after it has been cached.

**Do not promote RC13 to production until all critical device checks above pass.**
