# v10.10.0 Stage 4 — Mobile Navigation & Back

Implemented a browser-history controller over the existing page router without changing Schema 12.

Behavior:
- Each real `goPage()` transition creates an in-app history entry.
- Hardware/browser Back dismisses the top open modal or reader UI first.
- Nested Mushaf navigation drawers close before the Mushaf reader itself.
- When no overlay is open, Back restores the prior in-app page.
- Home is the navigation root; first Back on Home shows an exit hint, a second Back within 1.8 seconds allows exit.
- Existing page renderers, feature wrappers, student/session data, and Supabase SQL are unchanged.

Offline remains a separate next stage. This stage only advances the PWA cache generation so the new navigation controller is deployed reliably.
