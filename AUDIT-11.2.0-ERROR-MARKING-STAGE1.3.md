# v11.2.0 — Error Marking Stage 1.3 Hotfix

## Purpose
Restore the pre-error-marking WhatsApp UX for the main **Save & Send to Guardian** action.

## Behaviour
- `حفظ وإرسال لولي الأمر` saves the session then opens the guardian WhatsApp chat directly through the existing `openWhatsApp()` path.
- The Android file share sheet no longer intercepts the main Save & Send action when Quran error annotations exist.
- Annotated PNG generation remains available from the explicit `مشاركة صورة الأخطاء` button.
- Short/detailed WhatsApp mode buttons also use the direct message-first flow.
- No student/session migration; no SQL change; local schema remains 12.
