# RC16 — Server-authoritative learning ledger

This feature is isolated on \`feature/rc16-complete-upgrade\`. It is not active in production until the additive SQL migration and Edge Function are deployed.

## What it adds
- An append-only achievement event table. Database triggers reject update and delete operations.
- A teacher-authenticated Edge Function for listing events, approving quiz attempts, and creating/closing competitions.
- Server-generated approval timestamps. The browser cannot backdate points into a competition window.
- Idempotent quiz approval using a unique owner/idempotency key.
- Hashed student references only; no student names or direct local IDs are written to these tables.
- Private teacher-only reads and writes. The tables have RLS enabled and no direct anon/authenticated grants.
- Competitions retain immutable participant and group-assignment snapshots; only an active-to-closed transition is permitted.
- Competition creation uses an owner-scoped request key, so retrying after a lost response does not create a duplicate.

## Staging deployment

1. Back up a separate staging project and confirm it contains the current academy schema. Do not target the project ref recorded in supabase/config.toml unless it has been independently confirmed as disposable staging.
2. Apply the additive SQL scripts in this order: sql/rc16-home-recitation.sql, sql/rc16-ai-recitation.sql, sql/rc16-learning-ledger.sql.
3. Confirm the Edge Function has the standard SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY secrets. Never add the service-role key to browser code, Git, or GitHub Actions secrets.
4. Deploy with supabase functions deploy rc16-learning-ledger and keep gateway JWT verification enabled.
5. The Edge Function independently calls auth.getUser() and checks that the account is active and has the owner/teacher role.
6. Create two dedicated active staging teacher accounts (A and B), then run node tests/rc16-staging-acceptance.mjs with the environment variables documented in docs/RC16-RELEASE-ACCEPTANCE.md.
7. The automated staging test checks owner isolation, direct table-access denial, duplicate quiz approval, duplicate competition creation, close-only permissions, JWT enforcement, and CORS. It creates synthetic append-only staging rows and intentionally retains them; do not point it at production.
8. The local CI database contract test also checks RLS/grants, private data tables, append-only triggers, competition close-only behavior, and retention-safe foreign keys.

## Scoring and privacy
- A teacher must explicitly approve an attempt.
- The server computes points as \`min(20, correct_count × 2)\`; zero-point approvals are recorded for audit but do not contribute to standings.
- The server approval time is used for competition windows; the client cannot choose a timestamp.
- Competition group membership is frozen at creation, so later student transfers do not rewrite historical standings.
- Competitions are never exposed through student or guardian portal APIs. There is no public child leaderboard.
- Student references are SHA-256 hashes scoped to the authenticated owner account.

## Offline behavior
- Quiz attempts remain locally saved and can be reviewed offline.
- If the server is unavailable, a teacher's approval request is not marked as approved and no points are displayed from local state.
- When connectivity returns, the teacher can retry. The server idempotency key prevents duplicate points if the first request succeeded but the response was lost.

## Rollback
Disable the Edge Function or unlink its UI entry if necessary. Do not drop the ledger or competition tables after real events exist. The append-only achievement table is historical data and must be retained.
