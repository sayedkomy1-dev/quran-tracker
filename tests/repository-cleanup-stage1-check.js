'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const safeDeletes = JSON.parse(read('review/SAFE-DELETIONS.json').toString('utf8'));
const cleanup = JSON.parse(read('review/HISTORICAL-SNAPSHOT-CLEANUP.json').toString('utf8'));
const archivePath = cleanup.archive;

assert.equal(Object.keys(safeDeletes).length, 54, '54 historical source files must be SHA-256 inventoried');
assert.equal(cleanup.archived_files, 54);
assert.equal(cleanup.historical_screenshot_source_files, 53);
assert.equal(cleanup.obsolete_cleanup_scripts_archived, 1);
assert.equal(hash(read(archivePath)), cleanup.archive_sha256, 'historical source archive hash mismatch');

const batch = read('APPLY_CLEANUP.bat').toString('ascii');
assert(!/powershell|Remove-Item/i.test(batch), 'Windows cleanup must not require PowerShell');
const calls = [...batch.matchAll(/call :remove_if_hash "([^"]+)" "([a-f0-9]{64})"/gi)];
assert.equal(calls.length, 58, 'cleanup batch must contain 54 historical files + 4 CSS snapshots');

const expected = new Map();
for (const [p, digest] of Object.entries(safeDeletes)) {
  expected.set(p.replaceAll('/', '\\'), digest);
}
for (const [p, digest] of Object.entries({
  'styles.css': 'ca9ea955d72108b3a8cc7d2c9ec2c2e5486538cbeaaf05572c5ae47a6970822e',
  'v9.css': 'eaa9d8827bd5898d605d3185a526f440e531ff9081ab07be6fd4001a712eedef',
  'v10.css': 'e4d356ac5b94834eba94661c023afd6665a438edb64953aaf42240d2c09b78df',
  'v11.css': '27d01ded6c327acd95c4efb1d4f84297345911c2236cd7d78bd512847396640b'
})) expected.set(p, digest);

const actual = new Map(calls.map(m => [m[1], m[2]]));
assert.equal(actual.size, 58, 'cleanup targets must be unique');
for (const [p, digest] of expected) {
  assert.equal(actual.get(p), digest, `missing or wrong cleanup hash for ${p}`);
}

for (const p of ['styles.css', 'v9.css', 'v10.css', 'v11.css']) {
  assert.equal(fs.existsSync(path.join(root, p)), false, `${p} must not remain in the active root`);
  const archived = `archive/historical-css/${p}`;
  assert.equal(hash(read(archived)), expected.get(p), `${archived} is not the canonical snapshot`);
}
assert.equal(fs.existsSync(path.join(root, 'review/SAFE-DELETE-HISTORICAL-SNAPSHOTS.ps1')), false,
  'obsolete PowerShell helper must not remain in the active project');
assert.equal(fs.existsSync(path.join(root, 'screenshots/index.html')), false,
  'historical screenshot application source must be removed from the active tree');
assert.equal(fs.existsSync(path.join(root, 'screenshots/desktop-home.png')), true,
  'reference screenshot must be retained');
const retainedImages = [];
function walk(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel);
    else if (/\.(png|jpe?g|webp|gif|svg)$/i.test(entry.name)) retainedImages.push(rel);
  }
}
walk('screenshots');
assert.equal(retainedImages.length, 20, 'all 20 reference images must remain');

const version = read('VERSION').toString('utf8').trim();
const pkg = JSON.parse(read('package.json').toString('utf8'));
const html = read('index.html').toString('utf8');
const sw = read('sw.js').toString('utf8');
assert.equal(version, '11.12.1-beta.27', 'cleanup must not bump the runtime version');
assert.equal(pkg.version, version);
assert(html.includes(`application-version" content="${version}"`));
assert(sw.includes(`const APP_VERSION = '${version}'`));
assert.equal(pkg.version, '11.12.1-beta.27');
assert.equal(JSON.parse(read('review/STAGE1-TEST-REPORT.json').toString('utf8')).local_schema, 12);

console.log('repository-cleanup-stage1-check: PASS — archive, SHA-guarded cleanup, CSS snapshots, 20 reference images, runtime version and Schema 12');
