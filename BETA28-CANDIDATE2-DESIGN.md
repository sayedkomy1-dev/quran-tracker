# beta.28 Candidate 2 — Reference palette

Based on Candidate 1. Visual direction from the supplied screenshots, not a pixel-for-pixel reproduction.

- Guest practice: charcoal (#202226), blue (#135d9d), light text, blue active ayah; dark default, explicit light toggle with an independent local preference. Guardian's existing dark theme uses the charcoal/blue training screen.
- Guardian/student: white, mint (#dcf6e6), warm gold (#fff0bc), green action (#167347). Student presentation retains the existing role and permissions, not a separate account. Portal login and portal directory also use the new colors.
- Teacher/admin main interface, Quran page artwork, existing Quran typography, audio and finance logic, database and permissions unchanged.
- Added versioned CSS and script to the offline shell; fresh cache identifier. Internal release version remains beta.27 until acceptance.
- `npm test` exits 0; new VM regression tests cover default, toggle, persistence, denied storage, isolation and asset references. CSS parsed successfully (64 rules). Browser navigation blocked by environment policy (ERR_BLOCKED_BY_ADMINISTRATOR), so real visual/runtime and PWA update checks remain pending.

## Acceptance on desktop/mobile
1. Open guest practice; verify dark default; switch to light and reload; verify choice persists. Start a training session in both modes, change reciter, and check active ayah contrast, controls and scrolling.
2. Open guardian login; test light, dark and child modes. Authenticate with test account, switch parent/student presentation, and confirm financial records are unchanged and permissions unchanged. Test correction/assignment/audio share.
3. Verify at 320, 390 and desktop widths, with OS light/dark preference. Test offline upgrade after caching, and installed app refresh. Do not deploy before acceptance.
