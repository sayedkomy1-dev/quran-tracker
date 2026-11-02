'use strict';
// Confirm the public reader has exactly one HD source, and the old source cannot come back on an error.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),rd=p=>fs.readFileSync(path.join(root,p),'utf8');
const page=rd('academy-mushaf.html'),reader=rd('js/features/academy-mushaf.js'),css=rd('css/platform/academy-mushaf.css'),sw=rd('sw.js');
assert(!page.includes('data-mushaf-source'), 'No old/new Mushaf selection must be visible');
assert(!page.includes('المصحف الأصلي')&&!page.includes('مصادر المصحف'), 'Old source text must be removed');
assert(page.includes('id="amRetry"')&&page.includes('مصحف المدينة عالي الدقة'), 'Only HD source with retry UI');
assert(reader.includes('quran-hd-images/main/images/')&&reader.includes("padStart(3,'0')"), 'HD source must be sole image endpoint');
for(const forbidden of ['classicUrl','mushaf604/page-','hafs-kfqc','sourceChange(','data-mushaf-source',"source='classic'", "source='hd'"])
 assert(!reader.includes(forbidden), 'Legacy public viewer reference remains: '+forbidden);
assert(reader.includes("el('amRetry').hidden=false")&&reader.includes("change(current,true)"),'Network errors must offer retry instead of old-source fallback');
assert(!css.includes('.am-view-switch')&&!css.includes('.am-view-option'),'Old source selector styles must be removed');
assert(sw.includes("ACTIVE_CACHE_NAME = LIVE_CACHE_NAME + '-mushaf-hd-only'"),"Fresh service worker cache required");
for(const q of ['academy-mushaf.css?v=11.12.1-beta.27-hd-only','academy-mushaf.js?v=11.12.1-beta.27-hd-only'])
 assert.equal(sw.split(q).length,3,'Both service-worker shell lists must use new reader assets');
assert(rd('js/features/mushaf-offline.js').includes('cdn.quran.ws'), 'Shared offline learning resources must not be deleted');
console.log('PASS HD-only public Mushaf: no old selectable source, no automatic fallback, error retry and cache upgrade');
