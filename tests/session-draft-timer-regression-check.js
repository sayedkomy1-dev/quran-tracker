/**
 * Session draft timer regression: never recreate a draft after a successful save.
 * Runs extracted production functions in an isolated VM. No network or real user data.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function lastFunction(name) {
  const matcher = new RegExp('^function ' + name + '\\(', 'gm');
  let found, position = null;
  while ((found = matcher.exec(source)) !== null) position = found.index;
  assert.notEqual(position, null, `Missing ${name} in app.js`);
  const nextFunction = /\nfunction [\w$]+\(/g;
  nextFunction.lastIndex = position + 1;
  const next = nextFunction.exec(source);
  return source.slice(position, next ? next.index : source.length).trim();
}
const functions = [
  'setDraftState', 'draftKey', 'captureDraft', 'scheduleDraftSave',
  'saveDraftNow', 'clearDraft', 'restoreDraft', 'saveSession'
].map(lastFunction).join('\n\n');
const setup = `
let draftTimer=null, draftSuspend=false, editingSessionId=null;
let sesStatus='حضر', secOn={new:true,rec:false,far:false,juz:false};
let grades={new:'',rec:'',far:'',juz:''},prevGrades={new:'',rec:'',far:'',juz:'',surahReview:''};
let juzChips=[],surahReviewChips=[],reviewDirections={new:1,rec:1,far:1,juz:1,surahReview:1};
let sessions=[];
function accountDraftPrefix(v){return 'fictional_draft_v'+v+'_regression_';}
function readActualSection(){return null;}
function buildSesData(){return {notes:document.getElementById('sesNotes').value};}
function validateSessionSections(){return '';}
function localDateKey(){return '2026-10-21';}
function findDailySession(){return null;}
function makeId(){return 'fake-session-001';}
function makeSessionISO(k){return k+'T00:00:00.000Z';}
function buildSumText(){return 'حصة اختبار';}
function save(){__saveCalls++;return __saveOutcome;}
function toast(){}
function vibrate(){}
function renderHome(){}
function celebrate(){}
function applyDraft(d){__appliedDraft = d;}
`;
function fixture(saveOutcome = true) {
  const storage = new Map();
  const elements = new Map();
  const byId = id => {
    if (!elements.has(id)) elements.set(id, {value:'',checked:false,textContent:'',className:''});
    return elements.get(id);
  };
  byId('sesSt').value = 'fictional-student';
  byId('sesDate').value = '2026-10-21';
  byId('sesNotes').value = 'بيانات اصطناعية';
  const ctx = vm.createContext({
    __saveOutcome: saveOutcome, __saveCalls:0, __appliedDraft:null,
    console,Date,JSON,setTimeout,clearTimeout,
    document:{getElementById:byId},
    localStorage:{
      getItem:k=>storage.has(k)?storage.get(k):null,
      setItem:(k,v)=>storage.set(k,String(v)),
      removeItem:k=>storage.delete(k)
    }
  });
  vm.runInContext(setup + '\n' + functions, ctx, {filename:'session-production-functions.js',timeout:1000});
  return {ctx,storage,byId};
}
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const noTimer = fixture();
  assert.ok(vm.runInContext('saveSession({silent:true})', noTimer.ctx));
  await wait(480);
  assert.equal(noTimer.storage.size,0,'No draft after successful save with no pending timer');

  const pending = fixture();
  vm.runInContext('scheduleDraftSave()', pending.ctx);
  await wait(100);
  const saved = vm.runInContext('saveSession({silent:true})', pending.ctx);
  assert.ok(saved);
  assert.equal(pending.storage.size,0,'Successful save immediately clears draft');
  await wait(485);
  assert.equal(pending.storage.size,0,'Pending autosave must not recreate cleared draft');
  assert.equal(vm.runInContext('restoreDraft('+JSON.stringify(saved)+')',pending.ctx),false,'No stale draft restored');

  const failed = fixture(false);
  vm.runInContext('scheduleDraftSave()',failed.ctx);
  await wait(100);
  assert.equal(vm.runInContext('saveSession({silent:true})',failed.ctx),null,'Failed save is surfaced');
  await wait(470);
  assert.equal(failed.storage.size,1,'Pending autosave remains available after failed save');

  const laterEdit = fixture();
  assert.ok(vm.runInContext('saveSession({silent:true})',laterEdit.ctx));
  laterEdit.byId('sesNotes').value='تعديل جديد بعد حفظ ناجح';
  vm.runInContext('scheduleDraftSave()',laterEdit.ctx);
  await wait(485);
  assert.equal(laterEdit.storage.size,1,'Later edits can still be autosaved');

  console.log('PASS session draft timer: success, pending callback, failed save, later edit');
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});
