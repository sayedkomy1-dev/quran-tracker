# OP Quran Tracker — QA v11.5 Stage 1 (Student Finance)

## Baseline
- Source: `OP-Quran-Tracker-v11.4-Stage2-Milestones-Complete.zip` (stable after user real-device confirmation).
- New release: `11.5.0`, current local schema **12**, branch `main`.
- **No SQL new or changed.** No destructive migration and no rewriting existing students or sessions.
- This is Stage 1 **teacher-only accounting**, not the full v11.5 financial portal/invoice workflow.

## Delivered
- Per-student session rate (EGP), monthly target session count, charge-absence toggle, saved monthly settings.
- Month ledger counts attendance / absence / leave from real session records (one saved record = one session; leave never billed).
- Discount, surcharge, signed opening balance, total billed, payment totals, outstanding / credit.
- Dated payments and methods: cash, bank transfer, Instapay, wallet, other. Payments saved on the student financial object.
- Payment void recorded with reason and timestamp (audit-friendly; no physical deletion).
- Closed month locks adjustments and payment changes; session totals and amounts are frozen to a snapshot.
- Alert if session rows change after a close (does not silently re-price a closed month).
- Previous month's **closed** balance automatically prefilled if next month has no ledger. The amount can be manually corrected and saved.
- New data saved through original `save()` local account snapshot/backup/sync mechanism; updatedAt and updatedByDevice refreshed.
- Finance deliberately NOT exposed through guardian portal token/snapshot/public phone login in Stage 1.
- Existing goal, revision, WhatsApp, offline, and authentication unchanged.

## Important accounting semantics
- `rateCents`/payments stored as **integer piasters**, avoiding floating-point billing error.
- `plannedSessions` is a target count, not an automatic flat monthly subscription: due = (attended + optionally absent) * per-session price - discount + surcharge.
- Closing is irreversible in Stage 1; if an old closed session is edited, a warning appears and user handles a manual correction in a later month.
- To settle old debt, record its payment in the **actual later month** after previous closed balance carries over.
- The default rate only applies to months not yet configured. A configured month retains its own saved rate; closing freezes it.
- This module follows the application's existing student-level sync merge (last-write-wins); concurrent offline finance edits across devices should be avoided until conflict-aware ledger sync is developed.

## Tests
- `npm test`: existing regression scripts and new `student-finance-stage1-check.js` PASS.
- Stage 1 finance test covers monthly boundaries, leave, billable absence, discounts, additions, payments, void audit, closure, frozen figures, carry-over, backup sanitizer validation, and guardian exclusion.
- `node --check` on all JS files PASS.
- Release package integrity and original SQL-directory comparison are verified separately before delivery.
- Browser screenshot automation in this environment **blocked by administrator** (both file:// and localhost; Playwright Chromium). **Real Android/PWA testing pending** after Push.

## Deferred to Stage 2 / later
- Guardian read-only tuition/account statement, with secure server-side authorization and additive SQL where required.
- Printable PDF/WhatsApp financial statements and academy-wide finance analysis.
- Conflict-aware merging for multi-device financial ledgers.
- No smart-review outcome rating (deferred as requested).

## Agreed deployment process
Replace ZIP contents (preserve `.git`) → Commit only → GitHub Desktop Screenshot → review → Push origin → real Android/guardian permission test. No Supabase SQL to run for this stage.
