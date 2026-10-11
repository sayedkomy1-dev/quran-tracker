# v11.2.0 — Error Marking Stage 1.2 Hotfix Audit

## Scope
- Restore **Save & Send to Guardian** after Stage 1.1.
- Restore annotated Quran-error PNG creation/share.
- Keep all Stage 1.1 persistence/UI fixes unchanged.

## Root cause
`students` is a top-level `let` binding in `app.js`, therefore it is **not** exposed as `globalThis.students`. Stage 1.1 looked up students through `g.students`, so both the image-share button and the WhatsApp override could return early even though the session had been saved correctly.

## Fix
- Read `students` and `settings` through the established read-only `ImamApp.State` bridge.
- Add `findStudent()` and a fail-safe WhatsApp handoff.
- Keep PNG generation, native file share, and download fallback intact.
- Bump the service-worker cache and feature cache-buster so Android receives the repaired feature file.

## Data safety
- No SQL.
- Schema remains 12.
- No student/session migration or deletion.
