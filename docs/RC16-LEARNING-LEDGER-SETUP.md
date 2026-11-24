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
1. Back up the Supabase project and test against a staging project first.
2. Run \`sql/rc16-learning-ledger.sql\` in the staging SQL Editor.
3. Confirm the Edge Function secrets \`SUPABASE_URL\`, \`SUPABASE_ANON_KEY\`, and \`SUPABASE_SERVICE_ROLE_KEY\` are available. Never add the service-role key to browser code or Git.
4. Deploy with:
   \`\`\`
   supabase functions deploy rc16-learning-ledger
   \`\`\`
5. Keep JWT verification enabled. The Edge Function independently calls \`auth.getUser()\` and checks that the account is active and has the owner/teacher role.
6. Test teacher A and teacher B separately. A teacher must never read or write the other account's events or competitions.
7. Test repeated approval of the same attempt and repeated submission of the same competition request key. Each retry must return the existing record without duplicating points or competitions.
8. Confirm a direct browser query to either table is denied and that SQL update/delete attempts on achievement events are rejected.

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
