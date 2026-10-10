# v10.10.0 Deep Audit — Navigation & Offline

This audit was run against the user-provided current `quran-tracker-main` after Stage 3.4.
No navigation/offline behavior is changed by Stage 3.5; the findings below are queued for the next stability stage.

## Fixed now — Guardian family linking

- The Stage 3.4 student switcher itself exists, but a sibling only appears after that student's own `guardian_portal_shares` row has been linked to the guardian account.
- Matching the same phone number in local student records did **not** automatically link siblings.
- Stage 3.5 now normalizes Egyptian mobile formats and, when phone access is enabled/moved for one student, sequentially links every active student with the same registered phone to the same guardian account/PIN.
- Also fixed the hidden switcher container: the author CSS `display:block` was overriding the HTML `hidden` state, producing an empty student selector when only one student was returned.

## Finding A — Android/PWA Back button is not routed

Severity: High UX issue.

- `goPage()` swaps `.pg` sections and updates `curPage`, but it does not call `history.pushState()` / `replaceState()`.
- There is no global `popstate` handler.
- Several overlays/modals are also opened only by toggling `.open`, with no history entry.
- Result: on Android in installed PWA mode, the system Back gesture/button can close/leave the app instead of returning to the previous in-app screen.

Recommended next fix:

1. Introduce one navigation controller for page routes.
2. Push a browser-history entry for in-app page transitions.
3. On `popstate`, close the top open modal/sheet first; otherwise return to the previous app page.
4. Keep Home as the root state so Back from a nested screen does not exit immediately.
5. Cover profile, tasks, follow-up, analytics, Mushaf reader, More sheet, quick search, student modal, Quran text modal, broadcast, and Guardian portal modal.

## Finding B — Offline startup is not fully deterministic

Severity: High reliability issue.

Good foundations already present:

- App data is local-first (IndexedDB with account-scoped localStorage fallback).
- Service worker precaches the main local app shell.
- A trusted-device auth fallback exists after a successful online verification.

Weak points found:

1. Supabase JS is loaded from `cdn.jsdelivr.net`, while the service worker handles same-origin requests only. The external library is therefore not part of the controlled offline shell.
2. Service-worker registration happens only after the auth gate and local DB initialization complete. Offline capability therefore depends on a previous successful controlled visit.
3. In `beforeAppInit()`, a missing Supabase session causes `trustedClear()` before the offline fallback path. If the local Supabase session disappears but the trusted-device marker still exists, offline entry can be lost unnecessarily.
4. Guardian phone/PIN sessions are intentionally network-backed. The portal stores the opaque session token, but not a safe cached last snapshot for offline viewing. The Guardian portal therefore cannot reopen authenticated data offline.
5. Only a tiny initial Mushaf page subset is precached. Full Mushaf offline depends on the separate download/import flow and should be verified independently.

Recommended next fix:

- Move service-worker registration as early as safely possible.
- Preserve trusted-device authorization on offline startup even when the local Supabase session object is unavailable; only clear trust on explicit sign-out or confirmed server denial.
- Make the Supabase loader non-blocking/offline-safe, ideally with a same-origin vendored build or an online-only dynamic load path.
- Add an Offline Readiness diagnostic showing: service-worker controller, cache generation, local account snapshot, trusted-device status, Mushaf pack coverage, and last successful sync.
- Cache the last verified Guardian snapshot locally for read-only offline reopening, without caching PINs or exposing other students.

## Finding C — PWA cache testing needs runtime coverage

Severity: Medium.

Current automated tests are primarily static/source-contract checks. They do not emulate:

- a real installed-PWA Back gesture,
- a cold offline launch,
- service-worker update/activation while offline,
- Guardian multi-student switching in a browser session.

Recommended next fix:

Add browser-level smoke tests (headless Chromium) for online warm-up -> offline reload, page Back routing, modal Back routing, and cached-shell availability.
