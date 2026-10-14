# QA — v11.7 Stage 1

- Baseline: v11.6.0 ZIP.
- Test command: `npm test` — PASS (48 suites).
- All JavaScript files checked via `node --check` — PASS.
- New private-ratings/supervision integration test includes linked guardian session, guardian form not shown on public link, no default submission, audit and RLS/static SQL security checks.
- Legacy functionality retains 47 regression suites.
- Existing SQL retained without byte changes, with one new additive script.
- ZIP integrity checked at packaging and no prior project files deleted.
- Production SQL, authenticated supervisor test and Android visual interactions still PENDING.
- DO NOT PUSH before Commit screenshot and subsequent SQL Success screenshot.
