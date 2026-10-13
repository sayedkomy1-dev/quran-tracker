# QA / Release — Imam Academy v11.4 Stage 2 (11.4.2)

## Scope
- Milestones 25/50/75/100%, based strictly on verified successfully recited ayah coverage, not rounded display percentages.
- Teacher progress card: achieved milestone indicators, manual celebration dialog and calm delay/overdue advisory. One-time achievement toast when an existing saved-session flow crosses a threshold.
- Teacher home overview: number of plans requiring attention; no automatic changes to lesson assignments.
- Guardian portal (read-only): milestones, expected completion date, supportive delay advisory, optional congratulation dialog. Uses existing guardian snapshots and PIN/live-link protections.
- **No** automated certification issuance; reserved for v11.8.
- Deferred Smart Revision rating (أتقن / يحتاج تثبيت / أخطأ مرة أخرى) remains deferred.

## Safety & compatibility
- Local Data Schema = **12** unchanged.
- Supabase SQL = **NO new SQL**. Existing SQL folder byte-for-byte unchanged (12 SQL files including archived screenshot copy).
- Student and session records: no resets/deletions/destructive migration. Progress is derived from successful session grades.
- Existing direct WhatsApp text/guardian opening, separate PNG/MP3 shares, audio reciters, service-worker offline shell, PWA mobile UI and guardian PIN login unchanged.
- Legacy Stage 1 mobile Hotfix 1 retained.

## Automated checks
- npm test: full regression suite + new v11.4 Stage 2 behavioral test passed (see npm-results; 44 scripts).
- v11.4 Stage 2 boundary tests: **PASS** for <25%, 25%, 50%, 75%, 100%; failed recitation excluded; no duplicate credit.
- Guardian payload: actual totals and milestone state, projected finish, no credentials or student IDs in goal payload.
- Explicit teacher consent: decline does not change session draft.
- Service worker: cache name/version updated; both guardian and teacher scripts/styles cache-busted.
- Chromium screenshot smoke attempt in sandbox: **not completed** (headless process timed out); do not claim visual/real-device QA is done.

## Archive diff against v11.4 Stage1 Mobile Hotfix1
- Existing files modified: 20
- Added files: 3
- Deleted files: 0
- SQL diff: 0

Changed files:
- `CHANGELOG.md`
- `README.md`
- `VERSION`
- `goal-planning.css`
- `guardian-portal.html`
- `index.html`
- `js/core/runtime.js`
- `js/features/goal-planning.js`
- `js/features/guardian-portal-view.js`
- `package.json`
- `sw.js`
- `tests/circle-analytics-check.js`
- `tests/followup-center-check.js`
- `tests/goal-planning-mobile-hotfix-check.js`
- `tests/goal-planning-stage1-check.js`
- `tests/guardian-portal-check.js`
- `tests/guardian-tahfeez-check.js`
- `tests/static-check.js`
- `tests/v11-premium-ui-check.js`
- `tests/v11-premium-ui-stage2-check.js`

Added files:
- `tests/goal-planning-stage2-check.js`

## Deployment sequence
1. Replace all files from ZIP in local Git checkout; **preserve `.git`**.
2. **Commit only** and send GitHub Desktop screenshot.
3. After review, **Push origin** (no SQL required).
4. Real-device Android PWA testing: teacher milestone view, warning, celebration, portal family login/multi-student, guardians snapshot refresh, offline cached shell, direct WhatsApp.
5. Mark Stage 2 stable **only** after confirming actual on-device behavior.
