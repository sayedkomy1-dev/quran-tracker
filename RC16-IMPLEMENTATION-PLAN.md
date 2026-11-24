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

### B — Home recitation submissions and audio feedback
- Added a student/guardian home-recitation card to the authenticated phone/PIN portal. The student can record through the real microphone or choose a real audio file, select the surah/ayah range, and add an optional note.
- Added a recoverable IndexedDB upload queue. It is bounded to 3 pending recordings / 50 MiB across the device, with a 20 MiB per-file limit and 20-minute maximum duration. The local blob is removed only after the server confirms successful upload.
- Offline recovery uses the existing guardian session restoration flow; if the session expires, the queued blob remains local until the same guardian account signs in again.
- Added a private Supabase Storage bucket and an additive SQL migration. The new tables use RLS with no direct anon/authenticated grants; the bucket is private and has no public read policy.
- Added a Supabase Edge Function that validates the existing guardian session, linked account, active academy owner, student reference, actual audio file signature, size, duration, and per-student daily upload limit. Teacher endpoints require a real Supabase JWT and an active owner/teacher account.
- Added a teacher inbox from the existing student progress panel. Teachers can play submissions, add annotations at the actual current playback time, optionally link an ayah within the assigned range, write student-visible feedback, add a separate private teacher note, and record/select a real voice comment.
- Student/guardian APIs return only explicitly published feedback. The private teacher note is not included in those responses.
- Added reversible archive/restore controls. Archiving changes status only; it never deletes the recording or its feedback.
- Playback uses private signed URLs that expire after 30 minutes. Browser code contains no service-role key.
- Existing Quran audio, offline Mushaf library, MP3 merge/export, WhatsApp handoff, Storage Governor, and Local Schema 12 remain unchanged.
- Added targeted tests for all 114 surah ayah counts, actual audio validation, offline queue behavior, student isolation, teacher authorization/privacy, private storage, signed playback, archive/restore, and service-worker shell integration.

### B deployment and acceptance boundary
- SQL migration and Edge Function source are committed; they have not been applied/deployed to the live Supabase project.
- The deployment checklist is in docs/RC16-HOME-RECITATION-SETUP.md. Staging deployment and real Android/iOS browser tests are still required.
- B is code-complete and CI-verified, but is not production-ready until the staging backend and device acceptance gates pass.

### Verification state
- GitHub Actions run #210 passed the complete Node npm test suite, SHA-256 release integrity for 846 files, and the linked-payload budget check.
- A1 student learning profile: 13/13 targeted checks.
- A2 structured teacher observations: 9/9 targeted checks.
- B home recitation: targeted security, offline queue, Quran range, signed playback, student isolation, teacher privacy, and shell integration test passed.
- Release payload: 493 KiB gzip JavaScript / 850 KiB limit and 120 KiB gzip CSS / 250 KiB limit.
- Real Android/iOS acceptance, staging Supabase deployment, visual review on target devices, and production rollout remain pending.
- This is not a production release and has not been merged into main.

## Current execution note
A1 and A2 are complete and CI-verified. B is implemented on the isolated branch and passed full GitHub Actions run #210, including 846 release hashes and payload budget. The remaining B gates are the documented staging Supabase migration/function deployment and real Android/iOS acceptance. No feature package is considered production-ready before those gates pass.

### C1 — Non-destructive Smart Board emergency recovery
- Added a dedicated emergency recovery action to the existing Smart Board.
- The action first requires a successful save of dirty work; if saving fails, recovery is aborted rather than discarding edits.
- Stops the lesson timer, audio/TTS, transient effects, and timeline timer; closes the native editor; returns the board to safe reading mode and pauses the student display.
- Preserves the selected student, Quran range, drawings, notes, private teacher note, public explanation, lesson preparation, and saved session.
- Does not delete or reset board content and does not create or approve an official lesson.
- Cache-busted the board asset in the app shell and service worker.
- Added regression assertions for save-before-recovery, emergency command wiring, safe pause, and preservation messaging.
- This is a focused C1 safety improvement; broader board templates and group preparation remain to be reviewed.


### E — AI-assisted recitation suggestions
- Added a teacher-only Edge Function and additive SQL audit table for tentative audio transcription and optional comparison against text supplied by the teacher from a trusted Mushaf.
- The endpoint validates the active teacher JWT, academy ownership, submission status, actual audio signature, file size/duration, private storage path, and a five-per-day owner quota.
- The model is not allowed to diagnose tajweed/makhraj, assign scores, or invent timestamps. The server forcibly sets every AI difference timestamp to null.
- AI output is stored as private teacher suggestions only. It is not written into official errors, grades, or student/guardian feedback.
- Live use requires the staging SQL migration, Edge Function deployment, and GEMINI_API_KEY configured through Supabase secrets. No provider key is present in the repository.


### Educational materials and D — quizzes, achievements, competitions
- The existing Academy Learning Center remains the source for the eight-level foundation curriculum, makharij, tajweed rules, and mutashabihat references; no duplicate content corpus was created.
- Added a teacher-only learning hub from the Academy Suite home screen.
- Practice question banks are generated from local source material: foundation, tajweed, makharij, mutashabihat references, and the app's 114-surah index.
- Verse-completion and next-ayah quizzes remain disabled until a complete, verified Quran text corpus is available locally. No Quran text is fabricated.
- Quiz attempts are stored as pending teacher review. They are not official grades and award no points until a teacher approves them.
- Added an append-only-in-the-UI achievement ledger with event source, student, approving teacher, timestamps, points, and idempotency key. The achievement ledger and competitions now use dedicated Supabase tables with row-level security, owner-scoped hashed student references, append-only database triggers for achievement events, server timestamps, and idempotent teacher approvals. The browser no longer treats local account snapshots as the source of truth for points.
- Added individual, single-circle, and circle-to-circle competitions. Cross-circle participation requires explicit opt-in; standings use approved ledger points only and remain teacher-only. No public child leaderboard and no speed-based points.
- Added a pedagogical helper that reads the student's actual teacher observations and surfaces relevant local strategies; it is advisory, not a diagnosis.

### C2 — Group lesson preparation
- Added quick preparation templates for foundation, memorization, revision, and group lessons.
- Added a student roster selector filtered by the preparation group.
- Group preparation creates a separate preparation copy per selected active student with independent stage IDs; it does not create an official lesson or change an assignment.
- Saved preparation templates remain account-scoped and available offline through the existing local store. The 100-item safety limit blocks new additions instead of silently evicting older saved preparations.

### F — Portal and experience integration
- Added the learning hub to the existing teacher home suite with explicit owner/teacher access.
- Home-recitation teacher review includes an optional AI suggestion panel. Student/guardian endpoints continue to return only explicitly published feedback; private teacher notes and AI suggestions remain private.
- Existing WhatsApp, Mushaf audio, offline library, MP3 export, and Storage Governor paths remain unchanged.

### G — Release hardening status
- Targeted tests now cover learning question banks, teacher approval, idempotent awards, competition opt-in, group preparation copies, AI authorization/privacy/quota/signature validation, and no-fake-timestamp behavior.
- The complete GitHub Actions release checks passed for the preceding UI build. The server-ledger integration has now been added to the branch and must pass a fresh full CI run. Staging SQL/function deployment and Android/iOS acceptance are still required before production.


### Educational materials and D — quizzes, achievements, competitions
- The existing Academy Learning Center remains the source for the eight-level foundation curriculum, makharij, tajweed rules, and mutashabihat references; no duplicate content corpus was created.
- Added a teacher-only learning hub from the Academy Suite home screen.
- Practice question banks are generated from local source material: foundation, tajweed, makharij, mutashabihat references, and the app's 114-surah index.
- Verse-completion and next-ayah quizzes remain disabled until a complete, verified Quran text corpus is available locally. No Quran text is fabricated.
- Quiz attempts are stored as pending teacher review. They are not official grades and award no points until a teacher approves them.
- Added an append-only-in-the-UI achievement ledger with event source, student, approving teacher, timestamps, points, and idempotency key. The achievement ledger and competitions now use dedicated Supabase tables with row-level security, owner-scoped hashed student references, append-only database triggers for achievement events, server timestamps, and idempotent teacher approvals. The browser no longer treats local account snapshots as the source of truth for points.
- Added individual, single-circle, and circle-to-circle competitions. Cross-circle participation requires explicit opt-in; standings use approved ledger points only and remain teacher-only. No public child leaderboard and no speed-based points.
- Added a pedagogical helper that reads the student's actual teacher observations and surfaces relevant local strategies; it is advisory, not a diagnosis.

### C2 — Group lesson preparation
- Added quick preparation templates for foundation, memorization, revision, and group lessons.
- Added a student roster selector filtered by the preparation group.
- Group preparation creates a separate preparation copy per selected active student with independent stage IDs; it does not create an official lesson or change an assignment.
- Saved preparation templates remain account-scoped and available offline through the existing local store. The 100-item safety limit blocks new additions instead of silently evicting older saved preparations.

### F — Portal and experience integration
- Added the learning hub to the existing teacher home suite with explicit owner/teacher access.
- Home-recitation teacher review includes an optional AI suggestion panel. Student/guardian endpoints continue to return only explicitly published feedback; private teacher notes and AI suggestions remain private.
- Existing WhatsApp, Mushaf audio, offline library, MP3 export, and Storage Governor paths remain unchanged.

### G — Release hardening status
- Targeted tests cover learning question banks, teacher approval, idempotent awards, competition opt-in, group preparation copies, AI authorization/privacy/quota/signature validation, and no-fake-timestamp behavior.
- The complete GitHub Actions release checks passed for the preceding UI build. The server-ledger integration has now been added to the branch and must pass a fresh full CI run. Staging SQL/function deployment and Android/iOS acceptance are still required before production.
