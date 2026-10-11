# v11.0.0 — Premium UI Foundation — Stage 1

This release starts the v11 Quran Academy Platform generation without changing student/session data or the local schema.

## Included

- New premium design system layer in `v11.css`.
- Branded teacher header with academy logo and clearer hierarchy.
- Compact live connectivity pill: `متصل` / `محلي`.
- Professional SVG header icons for search, follow-up and tasks.
- Premium home command center styling: primary next-session card, daily stats, shortcuts, Mushaf launcher and today's students.
- Refined mobile bottom navigation and desktop side navigation.
- Unified premium treatment for cards, forms, student cards, buttons, sheets and modals.
- Dark-mode and small-screen refinements.
- v11 UI layer is precached as part of the core offline shell.
- Existing Stage 5 offline boot and WhatsApp behavior are retained.

## Safety

- Local schema remains **12**.
- No SQL migration is required.
- `sql/` is byte-for-byte unchanged from v10.10.0 Stage 5.5.
- No direct migration or rewrite of student/session records.

## Validation

`npm test` passes the complete legacy regression suite plus `tests/v11-premium-ui-check.js`.
