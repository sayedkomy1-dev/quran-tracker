# Imam Academy — v11.4.0 Goal & Memorization Planning · Stage 1 completion QA

**Base:** user-uploaded `quran-tracker-main (2).zip`, which already included a partial v11.4 Stage 1 implementation. This release completes that implementation without rebuilding the app or deleting previous features.

## Delivered
- Five target modes: Surah/verse range, one Juz, contiguous multiple Juz, full Quran, and custom cross-Surah span.
- Configurable start/deadline, scheduled weekdays, sessions/week and optional memorization quantity per session.
- Total/completed/remaining unique Quran verses, measured from attended sessions with **passing grades on actual new recitation** (or verified graded legacy entries), never ungraded homework or failed marks.
- Sessions planned against actual weekday calendar, expected-vs-actual progress, on-time/ahead/behind/overdue status, remaining study sessions, and calculated estimated finish date.
- Teacher profile progress card and teacher home summary; one-sura next-session proposal applied to the **draft only** after explicit confirmation (no auto-save/send).
- Existing guardian read-only summary and milestone badges retained from uploaded source, not expanded further.
- `memorizationGoal` remains additive to the student record; old Juz/Surah goal records still work, no schema or DB migration.

## Executed automated QA
- `npm test` — PASS (all existing regression checks and newly-added goal calculation check).
- `node --check` for every JavaScript file — PASS.
- Dynamic goal test — PASS: 6,236 Quran verses, Juz 1 148 verses, 30-Juz full corpus, custom cross-Surah range, unique successful recitation counting, ignored weak/ungraded/absent data, count of actual weekdays, and teacher approval/rejection.
- ZIP archive integrity and SQL tree file-hash comparison — verify in release packaging script.

## Boundaries
- SQL: **none added, deleted, or changed**. Previous production portal SQL scripts must **not** be rerun.
- Local Schema: **12**. No student or session records are removed or reset.
- The deferred `أتقن / يحتاج تثبيت / أخطأ مرة أخرى` revision outcomes are **not** added.
- Automated static/logic checks do **not** replace a mobile PWA or Supabase production check. A Chromium headless browser smoke attempt was not completed in the environment, so **visual and live-device testing remains pending**.

## Rollout
1. Replace unpacked project files on local main while preserving `.git`.
2. Commit locally **without Push**; send GitHub Desktop screenshot for review.
3. SQL: **not required**; after commit verification and explicit instruction, Push origin.
4. Test on phone online/offline, create/edit a goal, confirm one applied proposal remains draft until saving, verify real graded progress, original WhatsApp direct flow, and guardian/audio regressions.
5. Mark stable only after real-device checks.
