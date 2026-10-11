# Release 11.2.0 — Interactive Error Marking Stage 1.2

Hotfix for Guardian image sharing and WhatsApp handoff. The bug was caused by reading lexical app state from `globalThis`; the feature now uses `ImamApp.State`.

No database migration. Schema 12.
