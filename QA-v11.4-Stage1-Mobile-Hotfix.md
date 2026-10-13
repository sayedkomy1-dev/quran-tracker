# v11.4 Stage 1 — Mobile Profile / Legacy Progress Hotfix

This is an additive repair of the **already-pushed v11.4 Stage 1** ZIP. It is not a new stage and does not migrate data.

## Changes

1. Mobile profile: the five student actions are now collapsed under an accessible "إجراءات الطالب" disclosure near the profile tabs. The actions remain unchanged, including direct WhatsApp/guardian access. The enormous sticky panel no longer covers cards or the bottom nav.
2. Verified-goal progress: use passing grades for `actualRecitation.new` when available; for historical (pre actual-recitation) records, recognize passing `prevGrades.new` as grading the *previous* attended session's assigned new memorization. Older same-section passing grades remain supported. Never count ungraded assignments, failures, or duplicate ayahs. Progress is still restricted to the goal's verse range.
3. Clarify "Juz X to Juz X" as "Juz X" in the UI.
4. Cache-bust the edited JS/CSS assets in HTML and Service Worker; bump only the Service Worker cache generation.

## Safety

- Existing data and session records are not deleted/reset/migrated.
- Local Schema **12** unchanged.
- Existing `.sql` files are byte-for-byte identical to the input ZIP. **No new SQL.**
- No change to direct WhatsApp text sending or audio/image sharing.
- Deferred Smart Revision evaluation has not been added.

## Verification

- `npm test`: PASS (including legacy/modern verified progress and mobile-action hotfix checks).
- All project JavaScript files: `node --check` PASS.
- ZIP CRC and file index: PASS.
- Real mobile test is still required **after** GitHub Desktop screenshot and Push.

## Release procedure

Replace files only (preserve `.git`), Commit only, share GitHub Desktop screenshot; Push only after screenshot approval. No Supabase action.
