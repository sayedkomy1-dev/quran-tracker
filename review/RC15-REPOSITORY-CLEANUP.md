# RC15 — Repository cleanup and integrity repair

- **Base:** \`main\` at \`37b3bc88e531af78e1b7e059bd09d3f886a085aa\` (Beta28 RC14).
- **Working branch:** \`cleanup/beta28-rc15-repository-hygiene\`.
- **Application version:** unchanged at \`11.12.1-beta.27\`.

## Applied cleanup

1. Removed the 53 historical source files listed in \`review/SAFE-DELETIONS.json\`. Each file was checked against its recorded SHA-256 before removal. The prior Git commit remains the recovery source; no history was rewritten.
2. Removed four root-level CSS copies (\`styles.css\`, \`v9.css\`, \`v10.css\`, \`v11.css\`). Each is byte-identical to its retained counterpart in \`archive/historical-css/\`.
3. Removed 15 duplicate image copies from the old \`screenshots/\` snapshot. Their Git blob identities matched retained canonical images in \`branding/\`, root icon assets, \`screenshots/\`, or \`screenshots-v9.1/\`. The \`screenshots/\` directory now contains only five distinct reference screenshots.
4. Kept the active runtime layers \`v8.js\`, \`v9.js\`, \`v10.js\`, and \`css/platform/legacy-features.css\` untouched because the current HTML/service-worker wiring still uses them.
5. Refreshed \`SHA256SUMS.txt\`: added the 18 existing RC13/RC14 files that were missing from the inventory, removed hashes for the 15 deleted duplicate images, and included the updated cleanup test and this report.
6. Corrected and expanded \`tests/version-debt-beta11-check.js\` so it verifies the current archived CSS hashes, the 53-file deletion manifest, the duplicate-image removals, retained reference screenshots, and local HTML asset paths.

## Preserved

- No changes to application runtime JavaScript, active CSS, SQL, schema, student/session records, audio workflows, WhatsApp sharing, or offline data behavior.
- No application version bump.
- The \`main\` branch is not modified; all changes are isolated on the cleanup branch.

## Validation status

- SHA-256 verification passed for all 53 files in the deletion manifest before removal.
- Duplicate-image identity checks passed for all 15 removed copies.
- Root CSS copies were confirmed identical to the retained historical archive copies.
- The repository CI workflow runs \`npm test\`, release-integrity verification, and the linked-payload budget check on pull requests. These checks must pass on the resulting PR before merge; no browser/device acceptance test is claimed by this cleanup report.
