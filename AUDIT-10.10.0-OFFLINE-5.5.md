# v10.10.0 Stage 5.5 — Offline WhatsApp Composer

## Real-device finding
On the tested Android PWA, `whatsapp://send?phone=...&text=...` opened WhatsApp while offline but landed on the WhatsApp home/contact screen and lost the prepared payload.

## Fix
- Offline handoff now uses the documented WhatsApp custom composer scheme with `text` only: `whatsapp://send?text=...`.
- This preserves the prepared report without needing network access; the teacher chooses the guardian conversation in WhatsApp.
- Online handoff continues to use the official `wa.me/<number>?text=...` click-to-chat URL, which carries both recipient and prefilled message.
- Service-worker cache generation bumped to Stage 5.5.

## Important platform limit
A browser/PWA cannot reliably guarantee offline routing to an unsaved WhatsApp phone number across Android/WhatsApp variants. WhatsApp officially documents phone targeting through the `wa.me` click-to-chat URL, which requires connectivity. Stage 5.5 therefore guarantees the offline message composer rather than relying on an undocumented phone parameter.

No SQL or local data schema changes.
