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
1. Back up the Supabase project before applying SQL.
2. Open the Supabase SQL Editor for project svtcntalwfmexthcnvqe.
3. Run sql/rc16-home-recitation.sql once. It is additive and does not change Local Schema 12.
4. From the repository root, install/use the Supabase CLI and link the project:
   supabase login
   supabase link --project-ref svtcntalwfmexthcnvqe
5. Deploy the function:
   supabase functions deploy guardian-recitation
6. Confirm the Edge Function has the standard Supabase secrets SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY. Supabase normally provides these to Edge Functions. If the service-role secret is absent, add it through Supabase project secrets; never commit or paste it into this repository.
7. Confirm the function is deployed with JWT verification disabled at the gateway. The function performs its own authorization: guardian session validation for student routes and Supabase auth.getUser() plus active app_users checks for teacher routes.
8. Test with a staging guardian account and staging teacher account before production.

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
