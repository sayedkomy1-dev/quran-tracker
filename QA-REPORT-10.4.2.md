# QA Report — v10.4.2

## Static / automated
- JavaScript syntax: PASS
- Existing project tests (`npm test`): PASS
- Versioned local assets in index: PASS
- Service worker cache: quran-pwa-v10.4.2
- Mushaf feature exports explicit `render` and `openCurrent`: PASS
- v9 compatibility bridge to new Mushaf feature: PASS

## Manual Android acceptance
1. Open More → Mushaf after deployment.
2. Confirm title contains `قارئ 10.4.2`; legacy 220 MB PDF installer must not be the primary screen.
3. Open one online page; it must render as page image, not Android black PDF card.
4. Download that page, disable internet, reopen it.
5. Open Quran teaching modal → `صفحة المصحف`; same SVG page must render.
6. Only after success, optionally delete the old 209.7 MB PDF from cleanup panel.
