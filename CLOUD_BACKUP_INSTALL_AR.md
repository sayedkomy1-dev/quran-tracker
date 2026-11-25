# PWA2 — Cloud Backup & Sync Safety (Beta 30)

- Daily plain JSON snapshots are stored in a private Supabase Storage bucket. They are not encrypted at application level.
- Each teacher uploads only to their own UUID folder. Export omits sync passphrases, auth secrets and PIN/device credentials.
- Owner can download a teacher's backup; a supervisor needs the separate `backups` scope granted by the owner. Listing and download are audited.
- Empty teacher roster publication is rejected by SQL.
- Automatic account sync is enabled once for existing accounts and retries on reconnect. The same sync passphrase is still required across devices.
- Each teacher opts in once after reading the notice in Settings. Backups run daily when the PWA is active/open; a browser cannot guarantee background execution while fully closed. Offline changes queue and upload when online.
- Run `sql/academy-cloud-backups-v1.sql` once after deploying. Migration is additive and does not delete student/session/task/finance data.
- The owner can grant backup download permission under Supervision > supervisor scope. The list shows up to the latest 90 snapshots; older files are not auto-deleted.
