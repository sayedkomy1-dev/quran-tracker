# 11.7.4.1 — Safety & Regression Audit

- Source: complete v11.7.4 multi-academy foundation ZIP; preserve .git locally.
- New features in grouped, optional modules; no destructive schema or legacy migration.
- Existing WhatsApp direct textual reports, PWA guardian login PIN, voice reciters, guardian finances, and teacher data flows remain unchanged.
- Public guest route includes **only the independent Quran learning player**, not guardian/student account controls.
- Security: guest progress RLS ties row to `auth.uid()`. Platform owner report uses `security definer` and an active-owner guard. Email is read from `auth.users` verified record, **not** an editable text field submitted from a browser.
- No auto worker takeover after the new SW is installed: only explicit `SKIP_WAITING` from user click. No code/html background refresh under the active SW.
- Role action cards are navigational UI only; owner and supervisor server access remains RPC-protected.
- No forced Google for open Quran practice; local guest storage can be lost if cleared.
- Pending: actual Google redirect/provider allowlist and real-device tests.
