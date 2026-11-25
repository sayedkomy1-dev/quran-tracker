'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const index=read('index.html'),sw=read('sw.js');
const teacher=read('js/features/teacher-error-marking.js');
const tafsir=read('js/features/imam-board-tafsir.js');
const quranExport=read('js/features/quran-audio-export.js');
const audioLibrary=read('js/features/offline-audio-library.js');
const reciters=read('js/features/quran-reciter-registry.js');
const portal=read('guardian-portal.html');
const guardianAudio=read('js/features/guardian-home-recitation-rc16.js');
const assignmentAudio=read('js/features/assignment-audio-share.js');
const tahfeezFlow=read('js/features/tahfeez-flow-rc14.js');
const maqraa=read('maqraa.html');
const manifest=JSON.parse(read('maqraa.webmanifest'));
const roleHome=read('js/features/role-home.js');
const sql=read('sql/RC29_Complete_Offline_Recitation_And_Assignment_Audio.sql');

assert(index.includes('id="quranOpeningGuide"'),'teacher mushaf must show opening guidance');
assert(index.includes('teacher-error-marking.js?v=beta29-rc17'));
assert(teacher.includes('function bindContent()')&&teacher.includes('installAyahActions();installWordActions(c)'),'dynamic Quran container must install verse-number and delegated word/letter actions');
assert(teacher.includes('function installWordActions(c)')&&teacher.includes("closest?.('.qmark-char')"),'word and individual-letter taps must route through delegated handler');
assert(teacher.includes("id=\"qmarkWordMeaning\"")&&teacher.includes('function openWordMeaning()'),'word/letter error panel must offer word meaning lookup');
assert(teacher.includes('function openAyahActions')&&teacher.includes('تفسير الآية')&&teacher.includes('إضافة موضع خطأ'),'verse number must open the two requested actions');
assert(teacher.includes("classList.contains('ia27-selecting-range')"),'verse range selection must remain separate from correction actions');
assert(teacher.includes('function refreshOpeningGuide()')&&teacher.includes('showBasmala=chapter!==9'),'teacher mushaf opening guidance must omit Basmala only for At-Tawbah and avoid Fatiha duplication');
assert(tafsir.includes('async function openWord')&&tafsir.includes('openWord,closeAyah'),'word meaning must be available from local corpus or Seraj tafsir fallback');
assert(tafsir.includes("bookId==='seraj'"),'word meaning lookup must prefer the word-meaning source');

assert(tahfeezFlow.includes('return ch>=1&&ch<=114&&ch!==9&&!(ch===1&&f===1)'),'public and guardian recitation must show Basmala for every passage except At-Tawbah and Fatiha first verse');
assert(quranExport.includes('const needsBasmala=chapter!==9&&!(chapter===1&&from===1)'),'exported assignment MP3 must prepend Basmala except At-Tawbah and avoid duplicate Fatiha Basmala');
assert(audioLibrary.includes("if(c!==9&&!(c===1&&f===1))rows.push([1,1,'basmala'])"),'offline selected-range download must include the reusable Basmala recording');

const readerRows=(reciters.match(/\['[A-Za-z0-9]+','[^']+kbps'/g)||[]).length;
assert(readerRows>=40,`shared reciter catalog must be broad (found ${readerRows})`);
for(const id of ['Abdurrahmaan_As-Sudais_192kbps','Saood_ash-Shuraym_128kbps','ahmed_ibn_ali_al_ajamy_128kbps','Minshawy_Teacher_128kbps'])assert(reciters.includes(id),`missing supported reader ${id}`);
assert(index.includes('quran-reciter-registry.js?v=beta29-rc17'));
assert(audioLibrary.includes('data-rec-search')&&audioLibrary.includes('filterReciters'),'large reciter catalog must be searchable in the offline library');
assert(maqraa.includes('data-maqraa="1"')&&maqraa.includes('data-imam-audio-library'),'standalone public Maqraa must own the full offline reciter manager');
assert(maqraa.includes('maqraa.webmanifest?v=beta29-rc17'));
assert(manifest.start_url.includes('maqraa.html')&&manifest.scope==='./'&&manifest.display==='standalone','Maqraa must install independently as a standalone PWA');

const recCard=portal.indexOf('id="portalHomeRecitationCard"');
const assignmentCard=portal.indexOf('id="portalAssignmentCard"');
assert(recCard>=0&&assignmentCard>recCard,'student/guardian recitation action must appear before the assignment list');
assert(portal.includes('id="portalRecitationNav"'),'quick portal action must jump directly to student recitation');
assert(portal.indexOf('offline-audio-library.js')<portal.indexOf('quran-audio-export.js'),'guardian portal must load the shared reciter registry and offline library before the exporter');
assert(!portal.includes('data-imam-audio-library'),'full-library management remains in the standalone public Maqraa, not the private guardian portal');
assert(guardianAudio.includes('OUTBOX_DB')&&guardianAudio.includes('flushOutbox')&&guardianAudio.includes("addEventListener?.('online'"),'guardian/student recordings must persist offline and upload when connectivity returns');
assert(guardianAudio.includes('card.hidden=!context?.studentRef'),'pending outbox remains visible for a linked student even if the active assignment changes');

assert(assignmentAudio.includes('DB_NAME=')&&assignmentAudio.includes('async function flushQueue()'));
assert(assignmentAudio.includes('https://wa.me/${item.phone}?text=')&&assignmentAudio.includes('createSignedUrl(item.path,LINK_TTL)'));
assert(assignmentAudio.includes("g.addEventListener?.('online'"),'assignment audio must upload after reconnection');
assert(assignmentAudio.includes('await openChat(ready)')&&assignmentAudio.includes('اضغط إرسال داخل واتساب'),'WhatsApp handoff must remain an explicit user-confirmed send');
assert(roleHome.includes('role-hero-action')&&roleHome.includes('role-hero-recitation')&&roleHome.includes('role-hero-maqraa'),'first-screen hero and independent Maqraa shortcut must be present');
assert(index.includes('role-home.js?v=beta29-rc17')&&index.includes('maqraa.html'));

assert(sw.includes("const APP_VERSION = '11.12.1-beta.29'"));
assert(sw.includes("'-rc17-integrated-offline-teaching-audio'"));
for(const ref of ['js/features/teacher-error-marking.js?v=beta29-rc17','js/features/imam-board-tafsir.js?v=beta29-rc17','js/features/assignment-audio-share.js?v=beta29-rc17','js/features/quran-reciter-registry.js?v=beta29-rc17','maqraa.webmanifest?v=beta29-rc17'])assert(sw.includes(ref),`service worker must precache ${ref}`);
assert(sql.includes('guardian_home_recitation_complete_upload')&&sql.includes('teacher-assignment-audio')&&sql.includes('create policy'),'single additive SQL migration must cover guardian recitation and teacher audio link storage');

console.log('PASS RC17 integrated contract: correction taps, tafsir/word lookup, Basmala, offline audio queue, public standalone Maqraa, reciter catalog, portal priority, PWA update and SQL migration');
