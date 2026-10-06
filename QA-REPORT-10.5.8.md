# QA Report — We Live Quran v10.5.8

## Scope
Mushaf Final Polish only. No student/session/sync schema changes.

## Automated checks
- `node --check js/features/mushaf-offline.js` — PASS
- `npm test` — PASS
  - Static checks passed for We Live Quran v10.5.8
  - Recitation carry-forward checks passed for v10.5.8
- Runtime metadata/version alignment — PASS (`10.5.8`)
- Schema remains `12` — PASS
- KFGQPC Surah title assets: 114/114 — PASS
- KFGQPC Juz title assets: 30/30 — PASS

## Mushaf regression checks
- Surah drawer no longer renders a second plain-text Surah name beside the KFGQPC title artwork — PASS
- Juz drawer no longer renders a second plain-text Juz name beside the KFGQPC title artwork — PASS
- Text fallback remains available if a title artwork file fails — PASS
- Surah/Juz drawers do not auto-focus the search field on open — PASS
- Soft keyboard is dismissed on list touch-scroll / scroll / wheel — PASS
- Soft keyboard is dismissed when closing/selecting from a drawer — PASS
- Full-pack button uses a hard `display:none!important` path after `604/604` is confirmed — PASS
- Reader footer reflows after the download button disappears, so no empty download slot remains — PASS
- Home full-download action follows the same complete/incomplete state — PASS
- Mushaf management page hides full/range download actions when the pack is complete — PASS

## Data safety
- No SQL migration added.
- No Supabase table/policy/function changes.
- No change to Schema 12.
- No change to encrypted account sync format.
- No deletion/migration of student or session data.

## Device verification requested after deployment
1. Open Surah index: keyboard should remain closed until the search box is tapped.
2. Scroll Surah index: if keyboard is open, it should close automatically.
3. Confirm each Surah row shows one calligraphic Surah title only.
4. Repeat the same checks for the Juz index.
5. If the offline pack is complete, confirm the reader download button and home download button are absent and the footer has no gap.
6. If a page is deliberately removed later, confirm download action can return for an incomplete pack.
