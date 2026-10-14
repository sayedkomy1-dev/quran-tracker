# v11.7.0 Stage 1 — security / scope audit

Baseline: `OP-Quran-Tracker-v11.6-Stage1-Guardian-Teacher-Communication.zip`.

## Implemented
- Guardian ratings: six 1–5 measures, optional private note. Requires a valid linked guardian phone+PIN session, cannot operate from a public link. One editable rating per linked guardian account and student.
- Owner/supervisor view: aggregate ratings + details; published student indicators; message counts; supervisor grant/revoke; append-only read/action log. Teacher has no RPC to retrieve ratings.
- Supervisor is a **separate application permission** backed by `app_supervisor_grants`; existing `app_users` roles (`owner`,`teacher`) and policies are **not** rewritten. The owner is authorized automatically. Supervisor authorization is verified in every protected RPC.
- No phone numbers, PINs, session tokens or personal device/IP telemetry saved in ratings/audit tables. Access requires online auth.
- Read-only published-student indicators are only as current as their most recent published snapshot. No claim to cover all offline attendance, local-only sessions or circles.

## SQL
- New **additive** `sql/teacher-ratings-supervision.sql`: isolated tables/RPCs and RLS. Run only **after** GitHub Desktop Commit screenshot has been reviewed. No legacy SQL is to be re-run.
- Existing SQL files byte-identical. No DROP/TRUNCATE/DELETE or migration of existing students, sessions or ledger.
- Local Schema = 12, unchanged.

## Remaining tests
- Supabase Production SQL execution (not performed by assistant).
- Android guardian PIN rating, re-rating and logout/public-link separation.
- Owner granting/revoking supervisor and supervisor role boundary on a second authorized account.
- Real-device dashboard, dark/kids themes, live RPC failure and offline shell.
- Browser graphical integration could not be verified in this execution environment.

## Scope note
This is **Stage 1** of v11.7. The supervisory dashboard currently shows counts and published snapshot indicators; a complete academy-wide local-to-cloud attendance, circle analytics, session and performance drilldown is not claimed. Do not treat Stage 1 as stable until Android and permission tests succeed.
