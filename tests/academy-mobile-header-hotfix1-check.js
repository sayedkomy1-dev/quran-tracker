/* Review 8 Mobile Header Hotfix 1 — structural regression checks. */
const fs = require('fs');
const assert = require('assert');
const path = require('path');
const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/platform/academy-life.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const suffix = '11.12.1-beta.27-life-review8-mobile-hotfix1';
assert(html.includes(`css/platform/academy-life.css?v=${suffix}`), 'index must load hotfix CSS');
assert.equal((sw.match(new RegExp(`css/platform/academy-life\\.css\\?v=${suffix}`, 'g')) || []).length, 2, 'both SW shell lists must cache hotfix CSS');
assert(sw.includes("'-academy-life-review8' + '-mobile-hotfix1'"), 'SW cache identity must advance');
assert(css.includes('body.imam-design-bridge:not(.v9-shell-ready) #mainNav'), 'scrollable fallback should only show before premium navigation');
assert(css.includes('body.imam-design-bridge.v9-shell-ready #mainNav'), 'premium navigation should hide fallback');
assert(css.includes('overflow-x:auto'), 'fallback must scroll horizontally');
assert(css.includes('flex:0 0 auto'), 'fallback tab widths should not collapse');
assert(css.includes('body.imam-design-bridge .hdr-actions'), 'header actions must be wrapped responsibly');
assert(!css.includes('.ayah-text{'), 'no Quran typography overrides');
console.log('academy-mobile-header-hotfix1-check: PASS');
