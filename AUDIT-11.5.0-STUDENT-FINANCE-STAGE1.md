# Audit — v11.5 Stage 1

- Additive student financial data: `student.studentFinance = {rateCents,plannedSessions,chargeAbsence,months:{YYYY-MM:{rateCents,plannedSessions,chargeAbsence,openingCents,discountCents,additionCents,payments,closedAt,closedSnapshot}}}`.
- SQL folder unchanged; no production data or schema migration.
- Privacy: finance data stays out of guardian link snapshots, including family/phone-PIN login; portal not changed in this stage.
- Sensitive amounts follow account-local snapshot and configured account sync; never placed in URLs.
- Locking: closedSnapshot is immutable, month cannot be closed twice; voided payments remain visible.
- Backup import sanitizer explicitly keeps finance data and validates dates/amounts/payment IDs.
- Offline: Service Worker core shell includes student-finance JS and CSS, cache version advanced to 11.5.0.
- Scope: Teacher-side finance accounting only; guardian statements and PDF deferred.
