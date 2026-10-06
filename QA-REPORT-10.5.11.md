# QA Report — v10.5.11

## Automated checks
Run with `npm test`.

Coverage includes:
- JavaScript syntax / static application regression suite.
- Recitation carry-forward behavior.
- Quran structure: 30 juz / 60 hizb / 240 quarter-hizb markers.
- Ayah-to-604-page Mushaf map.
- Five-state recitation assessment controls and repeat semantics.

## Acceptance points
- Five assessment choices are visible and large enough for mobile use.
- Excellent / very good / good keep smart advancement.
- Needs follow-up does not advance automatically.
- Repeat copies the same assignment into the upcoming assignment fields.
- Review items use the same assessment language.
- `إعادة` survives backup/import validation.
- Schema is still 12 and no database migration is required.
