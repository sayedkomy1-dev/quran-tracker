# QA Report — v10.5.3

## Automated checks
- `npm test` — PASS
- `tests/static-check.js` — PASS
- `tests/recitation-carry-check.js` — PASS
- JavaScript syntax checks — PASS for app.js, v8.js, v9.js, v10.js, auth.js, sync-core.js, sw.js and feature modules.

## Release guards added
- Today’s Students uses a switch UI and resets closed once on v10.5.3 migration.
- Hidden Today list has an explicit `display:none!important` rule.
- Integrated teacher Mushaf reader exists.
- Swipe navigation exists.
- Page-turn sound generator exists.
- Page source is the page-based Quran.ws SVG CDN.
- Legacy external full-PDF download URL is absent from the active Home path.
- Decorative reader frame styles exist.

## Manual test after deployment
1. Refresh the Home page after the v10.5.3 update: Today’s Students should be closed.
2. Toggle Today’s Students open and closed using the switch.
3. Open `مصحف المحفظ`: the reader should open inside the app, not a PDF viewer.
4. Turn one page with the arrows and one page by swipe; verify the page-turn sound.
5. If the full 604-page pack is not present, verify the Home download button appears.
6. After all 604 pages are downloaded, refresh Home and verify the download button is hidden.
7. Turn off the internet and confirm downloaded pages still open.

## Data safety
No student, session, task, authentication, or cloud-sync schema is changed by this release.
