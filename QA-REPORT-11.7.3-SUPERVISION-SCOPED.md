# QA Report — v11.7.3 / Supervision Stage 2

## Scope
- Full ZIP based on the last provided v11.7.2 Hotfix 2 archive.
- Fixed students opening at the end of a long dialog: details now expand directly below the selected teacher.
- Owner: academy-level teacher overview, all permission-backed roster/rating views, role grant/revoke, fine-grained supervisor teacher scope and owner-only audit.
- Supervisor: can view only assigned teachers, with separate flags for names, progress, ratings and message counts; no PIN, phone, finance, ownership controls or unrestricted audit.
- Teacher: explicit roster synchronization button at the top of Students page; uses hashed student refs, student name/group/level, aggregate present/absent counts. No guardian contact details.
- Until a teacher syncs, the owner sees students from **active guardian snapshots only**; these are not a complete local roster.

## Release gates
- `npm test`: full legacy regression suite **PASS** + v11.7.3 security test **PASS**.
- All 96 `.js` files verified with Node.js syntax parser **PASS**.
- Isolated Chromium 390px viewport: owner shortcut, selected-teacher inline student list, scope editing form and roster publish event **PASS**.
- Roster transmission test: did not include phone field **PASS**; refused empty/unloaded roster.
- Previous SQL files: byte-identical; new file: `sql/supervision-roster-permissions.sql`.
- Local Schema: **12 unchanged**.
- No local student/session/finance reset, no deletion of student data; existing published snapshots retained.

## Important limitations / production verification
- Backend Supabase SQL has **not** been run during build. SQL syntax and authorization are statically checked but still require Supabase Production confirmation.
- Database function code is intentionally replaced in-place to enforce new supervisor scopes (otherwise legacy RPCs would bypass grants). New tables are additive.
- Complete rosters require **each teacher** to open Students and click `مزامنة كشف الطلاب للإدارة` while online. This is manual, not continuous sync.
- Roster attendance counts reflect the last synchronization; older guardian snapshot mastery figures reflect last publication.
- Real device tests: owner and scoped supervisor access, student roster, ratings denial, audit trail, offline, and WhatsApp still pending after Push.
- No new permissions automatically given to an existing supervisor. The owner must explicitly assign each teacher and action.
- Do not execute SQL before the Commit screenshot has been reviewed; do not Push before SQL succeeds.
