# v11.5.1 Finance Stage 2 — additive audit

- Baseline: `OP-Quran-Tracker-v11.5-Stage1-Student-Finance.zip`, version 11.5.0.
- Student/session model unchanged; offline local Schema remains 12.
- Teacher monthly financial ledger preserved as v11.5.0 implementation; added visible shortcut, formatted printable statement, text-only direct WhatsApp, manually published secured guardian statements.
- The teacher alone chooses whether to publish. Unpublished/default finance never shows to guardians.
- The new SQL creates an isolated table and three new RPCs. Existing guardian RPCs are not replaced, student and session DB tables not altered.
- UI guard: closing the current month requires typed confirmation (إغلاق); future month closing was already blocked.
- Browser graphical preview denied by environment; requires Android confirmation before declaring stage stable.
