# Release 11.5.0 Stage 1 — Commit only

1. Save local backup first (sensitive accounting data will be maintained inside student account records).
2. Extract ZIP, replace project files, preserve `.git`.
3. Commit message: `feat(v11.5): student monthly finance stage 1`.
4. **Do not Push yet**: send GitHub Desktop screenshot for review.
5. No SQL to execute. Local schema is 12.
6. After approved Push, test one student monthly rate and unpaid/paid amount, absence policy, payment date/method and void, closing, next-month carry, offline reload, privacy of guardian portal.
7. Do not mark stable until actual mobile test passes.

See `QA-REPORT-11.5.0-STAGE1.md` for scope and limitations.
