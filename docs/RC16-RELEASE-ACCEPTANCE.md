# IMAM Beta28 RC16 — release acceptance checklist

This checklist is a release gate, not a claim that tests have already been performed. Keep the main branch unchanged until every required gate has evidence.

## 1. Automated checks
- [ ] GitHub Actions Imam Academy CI passes on the exact final feature-branch commit.
- [ ] Full npm test regression suite passes.
- [ ] All three Supabase Edge Functions pass Deno type-checking.
- [ ] Isolated local Supabase applies all three RC16 SQL scripts in order.
- [ ] Local database contract test passes: RLS, no direct anon/authenticated grants, append-only achievement events, competition close-only transition, private audio bucket, and retention-safe owner foreign keys.
- [ ] SHA-256 inventory and linked-payload budgets pass.

## 2. Staging backend
Use a separate staging project cloned from the current academy schema. The project ref currently present in supabase/config.toml is svtcntalwfmexthcnvqe; treat it as existing/live unless independently verified as staging.

Required environment variables:
- RC16_STAGING_SUPABASE_URL
- RC16_STAGING_SUPABASE_ANON_KEY
- RC16_STAGING_TEACHER_A_EMAIL
- RC16_STAGING_TEACHER_A_PASSWORD
- RC16_STAGING_TEACHER_B_EMAIL
- RC16_STAGING_TEACHER_B_PASSWORD

Both test accounts must be separate, active Supabase users with active app_users rows and owner/teacher roles. Run:

    node tests/rc16-staging-acceptance.mjs

The script refuses the configured project ref svtcntalwfmexthcnvqe and requires HTTPS. It creates a synthetic quiz achievement and individual competition for a synthetic hashed student reference. These rows are append-only/retained by design, contain no student names, and are scoped to the staging test accounts. Never bypass the guard or run this script against production.

- [ ] All three SQL scripts applied successfully to staging.
- [ ] guardian-recitation deployed with gateway JWT verification disabled; its own guardian-session/teacher-JWT checks remain active.
- [ ] teacher-recitation-analysis and rc16-learning-ledger deployed with gateway JWT verification enabled.
- [ ] Two-account acceptance script passes.
- [ ] Storage bucket imam-home-recitations is private.
- [ ] GEMINI_API_KEY is configured only as a server secret if AI is enabled; otherwise the UI shows the explicit unavailable state.

## 3. Android Chrome acceptance
- [ ] Record a real microphone sample and select a real audio file.
- [ ] Confirm surah/ayah range validation, file signature, size, and duration limits.
- [ ] Record while offline, close/reopen the portal, reconnect, and verify the queued blob survives and retries.
- [ ] Confirm the local temporary blob is removed only after server upload confirmation.
- [ ] Teacher can play the uploaded recording using a short-lived signed URL.
- [ ] Timestamp annotations seek to the actual playback position.
- [ ] Private teacher notes are never returned to the student/guardian.
- [ ] Student-visible feedback appears only after explicit publication.
- [ ] Archive and restore preserve the original recording and feedback.

## 4. iOS Safari acceptance
- [ ] Test microphone recording where MediaRecorder is supported.
- [ ] Test the real-file picker fallback where recording is unavailable.
- [ ] Test interrupted upload, page close/reopen, reconnect, and retry without losing the local queued file.
- [ ] Verify audio playback, signed URL expiry, annotation seeking, and published-feedback visibility.

## 5. Regression and release
- [ ] Existing Mushaf audio library and offline playback remain unchanged.
- [ ] Existing MP3 assignment export/merge remains unchanged.
- [ ] Existing WhatsApp text and audio handoff behavior remains unchanged.
- [ ] Storage Governor and Local Schema 12 remain unchanged.
- [ ] Student, guardian, session, attendance, correction, finance, certificate, exam, and historical records remain intact.
- [ ] Review UI on real target devices and attach screenshots/evidence.
- [ ] Update final implementation plan, release notes, and SHA-256 manifest.
- [ ] Only after all gates pass: mark PR #1 ready, review the diff, then merge by explicit release decision.
- [ ] Production rollout is a separate, backed-up operation; staging acceptance does not authorize production deployment.
