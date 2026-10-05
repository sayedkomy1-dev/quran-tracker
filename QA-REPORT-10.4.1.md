# QA Report — v10.4.1

- `npm test`: PASS
- JS syntax checks: PASS (`app.js`, `v9.js`, `v10.js`, `sw.js`, Quran engine, Mushaf offline feature)
- App version / Service Worker cache: 10.4.1
- Data schema: 12 (unchanged)
- New Mushaf offline keyspace: `mushaf:svg:gzip:page:*`
- Legacy full PDF remains opt-in and is never auto-deleted.
- Runtime device test still required: Android page display, one-page offline reopen, then legacy PDF cleanup.
