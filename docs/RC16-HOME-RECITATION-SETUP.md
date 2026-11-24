# RC16 — Home Recitation backend setup

This feature is committed on the isolated feature/rc16-complete-upgrade branch. It is not active in production until the SQL migration and Edge Function are deployed to Supabase.

## What this adds
- A private imam-home-recitations Storage bucket.
- Submission and feedback tables with RLS enabled and no direct anon/authenticated table grants.
- A single Edge Function that validates the existing guardian phone/PIN session for student uploads and a real Supabase user JWT for teacher review.
- Short-lived signed URLs for audio playback.
- Soft archive only; uploaded recordings and academic history are not deleted by this feature.

The Supabase service-role key is used only by the Edge Function. It must never be copied into index.html, guardian-portal.html, JavaScript files, or browser storage.

## Deployment — staging first
1. Create or select a separate Supabase staging project cloned from the current academy schema. Back it up before applying SQL.
2. Do not assume svtcntalwfmexthcnvqe is staging. It is the project ref currently recorded in supabase/config.toml; treat it as the existing/live project unless you independently verify otherwise. Never deploy RC16 to that project as part of this acceptance run.
3. In the staging SQL Editor, run these additive scripts in order: sql/rc16-home-recitation.sql, sql/rc16-ai-recitation.sql, then sql/rc16-learning-ledger.sql. They preserve Local Schema 12 and existing academic rows. The home-recitation script expects the existing public.guardian_portal_accounts table.
4. From the repository root, install/use the Supabase CLI and link only the separate staging project:
   supabase login
   supabase link --project-ref <STAGING_PROJECT_REF>
5. Deploy the functions with the intended gateway JWT settings:
   supabase functions deploy guardian-recitation --no-verify-jwt
   supabase functions deploy teacher-recitation-analysis
   supabase functions deploy rc16-learning-ledger
6. Supabase normally provides SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY to Edge Functions. Keep the service-role key server-side; never commit it or put it in browser code. Set GEMINI_API_KEY only as a Supabase Edge Function secret if AI suggestions are enabled.
7. Create two dedicated active staging teacher accounts (A and B) with matching active app_users rows and owner/teacher roles. Do not use real student accounts for automated acceptance.
8. Run the two-account server acceptance script with the staging URL, anon key, and the two test teachers' email/password credentials. See docs/RC16-RELEASE-ACCEPTANCE.md for exact environment variable names and command. It creates synthetic append-only test rows in staging and intentionally retains them.
9. Complete the Android Chrome and iOS Safari device checklist before any production rollout.

## Browser origins
The Edge Function currently allows:
- https://welivequran.online
- https://www.welivequran.online
- http://localhost:3000
- http://127.0.0.1:3000
- http://localhost:5500
- http://127.0.0.1:5500

If staging uses another origin, add that exact origin to ALLOWED_ORIGINS before deployment. Do not replace the allowlist with *.

## Limits and retention
- Maximum audio file size: 20 MiB.
- Maximum recording duration accepted from the browser: 20 minutes.
- Maximum 12 new submissions per student per 24-hour period.
- Offline pending files stay in IndexedDB until the server confirms upload.
- After confirmation, the local temporary audio blob is removed; the server copy remains.
- Teacher archive is reversible metadata only. No hard-delete endpoint is provided.
- Signed playback URLs expire after 30 minutes.

## Required staging acceptance
- Test Android Chrome recording and iOS Safari file/recording support where available.
- Test file picker fallback on devices without MediaRecorder.
- Disconnect after recording, close/reopen the portal, reconnect, and confirm the queued file retries without loss.
- Expire/revoke a guardian session and confirm upload is rejected while the local queued recording remains.
- Verify a teacher cannot read another teacher's submissions.
- Verify student/guardian responses never contain teacher_private_note.
- Verify only explicitly published feedback is returned to the student/guardian.
- Verify timestamp markers seek to the actual recorded playback position.
- Verify the private bucket has no public read policy.

## Rollback
Do not drop the tables or bucket after real recordings exist. To disable the feature, stop linking the feature UI and disable the Edge Function while retaining the private bucket and data. Any data removal requires a separately approved retention and export plan.

## AI recitation analysis — safeguards and limits
- The browser sends only the selected submission ID, optional teacher-supplied reference text, and authenticated teacher JWT. The private audio is fetched by the Edge Function from the private bucket.
- The endpoint allows active owners and teachers only, checks academy ownership, submission status, actual audio signature, size/duration, and limits usage to five analyses per owner per 24 hours.
- GEMINI_API_KEY is a server secret. Do not commit it.
- AI output is a tentative transcript and possible text differences only. It is not a calibrated confidence score, tajweed/makhraj diagnosis, official grade, or student record.
- AI-generated time positions are discarded by the server. Use the existing teacher playback controls to create real timestamp annotations manually.
- AI suggestions are stored in a teacher-only RLS-protected table and are not returned by student/guardian endpoints.
- A missing key, provider outage, or rate limit returns an explicit unavailable/error state. No synthetic audio, score, or fallback analysis is generated.


## Data-retention hardening

RC16 owner foreign keys use ON DELETE RESTRICT for submissions, feedback, and AI review rows. Deleting an academy auth user must not cascade-delete recitation history. Guardian-account unlinking may set the optional guardian reference to null while retaining the submission and its audio.
