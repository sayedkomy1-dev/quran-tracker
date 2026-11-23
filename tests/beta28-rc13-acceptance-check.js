'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=f=>fs.readFileSync(f,'utf8');
const index=read('index.html'),portal=read('guardian-portal.html'),guest=read('guest-practice.html'),maqraa=read('maqraa.html'),sw=read('sw.js');
const library=read('js/features/offline-audio-library.js'),exporter=read('js/features/quran-audio-export.js'),share=read('js/features/temporary-media-share.js');
const player=read('js/features/guardian-tahfeez.js'),assign=read('js/features/assignment-audio-share.js');
const validator=read('js/features/session-intelligence-119.js'),app=read('app.js'),v9=read('v9.js');

// Storage and offline safety
assert(index.includes('id="imamStorageManager"')&&index.includes('data-imam-audio-library'));
for(const page of [portal,guest,maqraa])assert(!page.includes('data-imam-audio-library'),'full library management belongs in teacher settings only');
assert(library.includes('statsAll')&&library.includes('canContinueAudioDownload'));
assert(library.includes('QuotaExceeded')&&library.includes('storageLimited'));
assert(share.includes('navigator.share')&&!share.includes('data-chat'));
assert(sw.includes('missingProtectedShellAssets')&&sw.includes('trimRuntimeCache(cache,0)'));
assert(sw.includes('5.7-storage-audio-portal-rc13'));
assert(app.includes('compactRedundantAccountMirrors')&&app.includes('byte-for-byte duplicates'));

// All supported EveryAyah reciters are aligned between the player, local library and exporter.
const ctx={globalThis:null,console,Blob,URL,TextEncoder,Uint8Array,AbortController,document:{readyState:'loading',addEventListener(){}},navigator:{onLine:true}};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(library,ctx);vm.runInContext(exporter,ctx);
const expected=['Alafasy_128kbps','Husary_128kbps','Husary_Muallim_128kbps','Minshawy_Murattal_128kbps','Minshawy_Teacher_128kbps','MaherAlMuaiqly128kbps'];
assert.deepEqual(Object.values(ctx.ImamOfflineAudio.RECITERS).map(x=>x.folder),expected);
assert.deepEqual(Object.values(ctx.ImamQuranAudioExport.RECITERS).map(x=>x.folder),expected);
assert(player.includes('downloadVerses(key,chapter,from,to'));
assert(player.includes('activeAudioToken')&&player.includes('waitForMediaReady')&&player.includes('token!==state.playRequest'));
assert(assign.includes('currentSignature()!==sectionAtStart')&&assign.includes("$('teacherAssignmentAudioReciter')?.value||'mishary'"));

// Guardian/student portal: remove teacher rating UI; keep family-only areas hidden in student view,
// while retaining personal progress and goals.
assert(!portal.includes('portalRatingCard')&&!portal.includes('portalRatingNav')&&!portal.includes('guardian-ratings.js'));
assert(portal.includes('data-ia28-view="student"')&&portal.includes('data-ia28-view="parent"'));
const portalCss=read('css/platform/temporary-media.css');
assert(!portalCss.includes('.portal-kpis,#portalGoalCard'));
assert(read('css/platform/rc13-portal-learning.css').includes('ia28-student-view .portal-kpis'));
assert(maqraa.includes('data-maqraa="1"')&&maqraa.includes('مقرأة الإمام'));
assert(read('guardian-login.html').includes('maqraa.html'));
assert(sw.includes("url.pathname.endsWith('/maqraa.html')"));

// Validation and save feedback
assert(validator.includes('reconcileDomSections'));
assert(validator.includes('نافذة مراجعة النواقص مفتوحة بالفعل'));
assert(validator.includes('اختر سورة'));
assert(read('js/features/teacher-error-marking.js').includes('beginSend()'));
assert(read('js/features/teacher-error-marking.js').includes('safeOpenWhatsApp(st,msg)'));
assert(app.includes('if(save()===false)')&&app.includes('تعذر حفظ الحصة على الجهاز'));

// Reversible archive and remote-access compensation; no hard-delete action is exposed.
assert(v9.includes('v9RestoreAccessAfterFailedLocalSave'));
assert(v9.includes('v9RestoreActiveStudents(list,{force:true})'));
assert(v9.includes('err.rollbackRestoredIds'));
assert(/async function deleteSt\(\)[\s\S]*?await setStudentStatusWithUndo\(id,'archived'\)/.test(v9),'delete action must be reversible archive only');assert(!/sessions\s*=\s*sessions\.filter\([^)]*studentId/.test(v9),'archive must not delete session history');

console.log('PASS Beta28 RC13 acceptance: storage safety, unified six-reader library, gapless-intent single-file export, guarded player, WhatsApp handoff, student/guardian UX, maqraa route, session validation, reversible archive');
