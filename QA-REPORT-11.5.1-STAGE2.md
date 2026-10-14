# QA — v11.5.1 Student Finance Stage 2

## Scope

- Visible **💰 الحسابات المالية** button directly below student's identity at the top of the profile, one-tap scroll to monthly account. No floating/overlapping navigation.
- Finance statement on teacher side: print/save as PDF through **browser/system Print → Save as PDF**, with A4 styling and payment log; works without internet when shell cached. No third-party PDF service.
- WhatsApp message uses direct phone-specific `wa.me` handoff (and `whatsapp://send?phone=` offline fallback). No Android Share Sheet for text.
- Guardian portal finance is deliberately separated from `#data=` snapshot and `#p=` public live links. Finance is **opt-in**: teacher taps Update guardian portal. Only authenticated phone + PIN session sees the published statement read-only, with recent payment list. A teacher can hide future access by revoke.
- Additive SQL file `sql/guardian-finance-statements.sql`, no existing SQL file changes. SQL must be applied after reviewing Git Commit and before Push.
- School/student data, app Schema 12, prior guardian PIN infrastructure, Smart Revision deferred outcomes, and direct session WhatsApp remain unchanged.

## Tests

- `npm test`: regression/static/finance v11.5.0 and v11.5.1 tests completed successfully.
- `node --check`: source JS all syntactically valid.
- Additive SQL reviewed for no drop/truncate/deletes and no direct table read by `anon`/`authenticated`.
- Browser graphical smoke test was **blocked by the test environment** (local HTTP and `file://` denied by administrator), so **not claimed to have passed**.
- Browser Print/Save PDF output, WhatsApp handoff, Supabase SQL execution/RPC, PIN-protected guardian finance and actual Android PWA visibility are **pending real-device / production tests**.

## Security note

Financial data uses `guardian_finance_publish` / `guardian_finance_revoke` (authenticated teacher) and `guardian_finance_session_read` (short-lived logged-in guardian session). SQL validates owner/student_ref, active teacher, linked non-disabled guardian PIN account, unrevoked share and unexpired session. Anonymous snapshots and public live-links never contain `studentFinance` or finance statements.

## Work order

1. Replace project files from full ZIP, preserve `.git`.
2. **Commit only**, send GitHub Desktop screenshot.
3. On approval run new SQL in Supabase and share `Success. No rows returned` screenshot.
4. Only then Push origin.
5. Test real Android UI: finance shortcut; print; direct WhatsApp message; publish/hide finance; phone+PIN guardian; public link isolation; monthly controls.
