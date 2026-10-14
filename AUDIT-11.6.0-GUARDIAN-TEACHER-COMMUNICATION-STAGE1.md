# v11.6 Stage 1 — Implementation and safety audit

Baseline: OP-Quran-Tracker-v11.5-Stage2-Finance-Quick-Access.zip (v11.5.1, fully tested by user).

- Existing WhatsApp communicator retained unchanged; inline teacher/guardian messaging is **new** and independent.
- Teacher inbox: Home shortcut and student-profile shortcut, student-based list, `new` / `read` / `replied`, category, one reply per message.
- Guardian: after phone + PIN session only; messages tied to verified student account; public `#p=` and `#data=` routes show no messaging form. Manual refresh; live only.
- Backend: one isolated new table, indexes, five new RPCs. Teacher authentication via `auth.uid()` + active `app_users` membership. Guardian permissions checked against unexpired/unrevoked session, linked account and active owner. Rate limits 5/15min and 30/day. RLS enabled; direct table access revoked. Supabase REST calls do not persist phone/PIN/IP/UA.
- No changes to existing tables, policies, RPCs or students/sessions; no deletions/resets; local Schema remains **12**.
- No claims of Offline message delivery; no queue containing personal messages. Failed network never reports confirmed delivery.
- **SQL is NOT executed by this release**: run separately in Supabase production *after Commit screenshot*, then inspect Success before Push.
- Real-device + real Supabase permissions tests required after Push. Optional future enhancements: refresh notification badge (v11.11), attachments (v11.9), supervisor access (v11.7).
