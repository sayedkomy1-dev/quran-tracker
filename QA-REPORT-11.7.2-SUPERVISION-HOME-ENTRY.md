# QA report — v11.7.2 supervision Home visibility fix

**Base:** OP-Quran-Tracker-v11.7.1-Supervision-Visibility-Hotfix1.zip

**Confirmed cause:** `v9.css` hides `#pg-home.v9-home-ready > :not(#v9Home)`.
The previously injected shortcut was inside the old `.smart-actions` group, which is a hidden child of the modern Home view. The button was inserted successfully but not visible.

**Fix:** `js/features/supervisor-dashboard.js` now mounts `#supervisorShortcut` as a top-level element of `#pg-home`, before `#v9Home`. `teacher-rating.css` explicitly exempts this one card from the Premium Home hidden-legacy rule and styles it prominently for mobile and desktop. The button is attached only for a trusted active owner or a server-approved supervisor. RPCs still enforce all private permissions; a visible button does not authorize viewing any records.

**Tests:**
- `npm test` — 49 regression scripts PASSED.
- New DOM test verifies owner with failed access verification still sees prominent entry but no private RPC, denied teacher sees no entry, approved supervisor sees entry, and duplicate buttons cannot appear.
- Headless Chromium inline DOM/CSS functional test at a 390×844 viewport — PASSED. Card is visible (`display:flex`), ahead of the Premium dashboard, the legacy action group remains hidden, clicking the card opens the dialog. This is an isolated browser test, not a full authenticated mobile device test.
- JavaScript syntax — PASSED (run before release).
- `sql/` — unchanged byte-for-byte from the base release. **No new SQL and no reruns required**.
- Local Schema — **12 unchanged**. No student/session reset, data migrations, or permission changes.
- Service worker and asset cache-version strings changed to `11.7.2` so installed PWA can fetch new CSS and JS.
- ZIP integrity — verify before delivery.

**Still needed:** GitHub Desktop Commit-only screenshot → approval to Push → real-device owner test of visibility and RPC access, non-owner test.
