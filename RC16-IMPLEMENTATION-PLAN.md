# IMAM Beta28 RC16 — Complete Educational Upgrade

## Status
- Baseline: current `main` branch.
- Working branch: `feature/rc16-complete-upgrade`.
- Delivery model: one RC16 initiative, implemented as independently reviewable work packages.
- Production safety: no direct changes to `main`; no production deployment from this branch.

## Non-negotiable compatibility rules
1. Preserve the current JavaScript/PWA architecture, Supabase integration, Local Schema 12, existing IndexedDB/LocalStorage contracts, and current service-worker strategy unless a separately reviewed migration proves necessary.
2. Preserve student, guardian, circle, session, attendance, correction, finance, certificate, exam, and historical records. No permanent student or academic-record deletion.
3. Preserve the existing Quran audio library, offline audio behavior, audio-export/MP3 assignment flow, WhatsApp handoff behavior, and Storage Governor. Do not replace these with the newer project's implementations.
4. Keep guardian and student permissions separate. Never add guardian teacher-rating functionality.
5. AI output is advisory only. It must never create an official grade, recitation error, student-level change, or academic decision without teacher review and explicit approval.
6. Never fabricate audio recordings, timestamps, confidence values, quiz outcomes, XP, achievements, or test results.
7. Offline queues must be explicit and recoverable. A failed upload must not delete the local pending recording.
8. Private teacher notes must remain private; only teacher-approved feedback may be visible to students/guardians.
9. No secrets, API keys, service-role credentials, or privileged tokens in browser code or committed files.
10. No SQL migration is applied automatically. Any optional migration must be additive, documented, reviewed, and accompanied by rollback guidance.

## Work packages

### A — Student learning profile and pedagogical guidance
- Extend existing teaching-insights and error-follow-up capabilities rather than creating duplicate systems.
- Record observable learning responses and teacher notes; do not label children with unsupported fixed learning-style diagnoses.
- Link recommendations to real student history and recurring corrections.
- Generate guardian message drafts only; teacher edits and sends manually through the existing WhatsApp flow.

### B — Home recitation submissions and audio feedback
- Student can record or select a real audio file and associate it with a surah/ayah range and optional note.
- Store pending uploads in IndexedDB; upload to a private Supabase Storage bucket using authenticated, scoped access.
- Remove local temporary audio only after server confirmation and according to the retention policy.
- Teacher review inbox supports review states, playback, timestamped annotations, text/audio feedback, and ayah/word association.
- Annotation timestamps must be derived from actual playback position and validated against audio duration.
- Distinguish private teacher notes from student-visible approved feedback.
- Never create fallback/synthetic audio when recording is unavailable.

### C — Imam Smart Board and lesson preparation
- Preserve the existing board engine and session linkage.
- Improve emergency recovery so it stops timers/audio/effects and restores safe reading mode without deleting saved board content, notes, or session data.
- Complete preparation templates, preview, ordered lesson stages, group preparation, offline persistence, and safe session handoff.
- Add selected tools only after verifying they are absent from the current board.

### D — Quizzes, competitions, and achievements
- Add verse completion, surah identification, next-ayah, mutashabihat, tajweed, and memorization quizzes.
- Competition scopes: individual, circle, and opt-in circle-to-circle.
- Add a centralized append-only achievement ledger with source, event, student, approver, timestamp, points, and idempotency key.
- Award points only for verified events; prevent duplicate awards.
- Do not reward recitation speed or publish public child leaderboards by default.

### E — AI recitation analysis
- Implement only behind an authenticated server-side endpoint with per-user authorization, file validation, size/duration limits, rate limits, quotas, and audit records.
- Compare actual speech recognition/alignment output with the selected Quran text.
- Return candidate observations with evidence, timestamps, and calibrated uncertainty.
- Do not claim reliable tajweed/makhraj diagnosis unless the model/service can substantiate it; otherwise label as teacher-review hints.
- Teacher approval is required before writing any result into official student records.
- If the AI service is unavailable, show unavailable/pending status; never generate synthetic scores or errors.

### F — UI/UX and portal integration
- Improve mobile usability while retaining current design-system conventions and role boundaries.
- Integrate home submissions and approved feedback into student portal.
- Guardian sees only explicitly published/approved educational feedback.
- Do not add guardian teacher ratings.
- Preserve existing WhatsApp behavior and existing portal login.

### G — Release hardening
- Add targeted tests for every new workflow plus regression tests for existing critical paths.
- Run the complete current `npm test` suite and all relevant targeted scripts in a real Node environment.
- Verify Android/mobile, offline, upload retry, storage quota, multi-account isolation, and Supabase RLS behavior.
- Update release notes, change manifest, acceptance checklist, and SHA256 manifest only after final files are stable.

## Explicitly deferred
- Drag-and-drop weekly schedule board.
- Seasonal programs.
- Broad Mushaf redesign or replacement of the current audio/offline engines.

## Acceptance gates
A work package is not complete until:
- Its tests pass.
- Existing relevant regression tests pass.
- No data-loss path is introduced.
- Role and RLS checks pass.
- Offline behavior is documented and tested where applicable.
- No fake or inferred data is presented as a real event.
- The change is reviewed on the working branch before merge.

## Implementation progress — first work package

### A1 — Evidence-based student learning profile
- Added `js/features/student-learning-profile.js` and `student-learning-profile.css`.
- Integrated the profile into the existing student progress card; no parallel student page or second analytics store.
- Uses only teacher-entered numeric assessments, attendance records, and the existing `ImamErrorFollowup` queue.
- Shows strengths only after at least 3 numeric samples across at least 2 sessions; potential support needs require at least 2 samples across at least 2 sessions.
- Attendance percentage is withheld until at least 4 attendance/absence records exist.
- Future-dated sessions and other students' records are excluded.
- Open errors remain tied to the existing historical follow-up engine; the UI states that this is historical data.
- No student record writes, SQL changes, storage changes, AI diagnosis, fixed learning-style labels, or automatic grading.
- Added `tests/student-learning-profile-check.js`, wired it into `npm test`, and extended the offline asset integrity test.
- Added the CSS/JS to the current HTML and both service-worker protected/offline shell lists; advanced the active cache suffix so the candidate cannot silently reuse the prior shell.

### A2 — Structured teacher observations
- Added a teacher-only observation ledger to the existing student progress view.
- Observation records require a dated, teacher-authored description of what was actually observed and a concrete next teaching step.
- Categories describe observable learning behavior; they do not assign a fixed learning style or diagnosis.
- Observations are stored inside the existing student snapshot, merged by stable observation ID across snapshot merges, and can be archived/restored without permanent deletion.
- Guardian/student snapshot generation remains an explicit field whitelist and does not include the private observation array.
- No SQL migration, new table, remote API, AI-generated observation, or automatic academic score was added.
- Added targeted validation, escaping, merge, archive, and portal-privacy tests.

### Verification state
- Isolated V8 runtime smoke checks passed for evidence thresholds, student/future-session isolation, attendance, existing error-engine integration, HTML escaping, script/style wiring, service-worker cache wiring, and test-runner wiring.
- GitHub Actions run **#176** passed the complete Node `npm test` suite, `node scripts/release-integrity.mjs` with all **837** file hashes, and `node scripts/release-budget.mjs`.
- The RC16 learning-profile test reports **13/13** passing checks within the full suite.
- Real Android/mobile acceptance, visual review on the target devices, and production rollout remain pending.
- This is not a production release and has not been merged into `main`.

## Current execution note
RC16 implementation is underway on the isolated feature branch. A1 is integrated and passed CI; A2 is implemented on this branch and awaits its next full CI run and real-device acceptance. No feature package is considered production-ready before the acceptance gates pass.
