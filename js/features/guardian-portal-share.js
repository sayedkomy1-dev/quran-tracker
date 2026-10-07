'use strict';
/* We Live Quran v10.10.0 — Guardian & Student Portal, Stage 1.
   Generates a compact read-only snapshot in the URL fragment.
   No database write, no phone number, no internal student/session IDs. */
(function guardianPortalShareFeature(g){
  const VERSION=1;

  function esc(v){
    if(g.ImamApp?.Utils?.escapeHtml)return g.ImamApp.Utils.escapeHtml(v??'');
    return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function dateValue(row){
    const n=Date.parse(row?.date||row?.sessionDate||row?.createdAt||'');
    return Number.isFinite(n)?n:0;
  }
  function dateLabel(row){
    const n=dateValue(row);if(!n)return '—';
    return new Date(n).toLocaleDateString('ar-EG',{day:'numeric',month:'short',year:'numeric'});
  }
  function score(v){
    if(v===null||v===undefined||v==='')return null;
    const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,Math.min(100,n)):null;
  }
  function sessionAverage(ses){
    const vals=[];
    const scores=ses?.assessmentScores||{};
    for(const k of ['new','rec','far','juz','surahReview']){const n=score(scores[k]);if(n!==null)vals.push(n);}
    for(const group of Array.isArray(ses?.reviewResults)?ses.reviewResults:[]){
      for(const item of Array.isArray(group?.items)?group.items:[]){const n=score(item?.score);if(n!==null)vals.push(n);}
    }
    return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
  }
  function sectionText(sec){
    if(!sec)return '';
    const surah=String(sec.surah||sec.surahName||'').trim();if(!surah)return '';
    if(sec.full)return `سورة ${surah} كاملة`;
    const from=Math.max(1,Number(sec.from)||1),to=Math.max(from,Number(sec.to)||from);
    return `سورة ${surah} — الآيات ${from}–${to}`;
  }
  function actualText(ses){
    const rows=[],actual=ses?.actualRecitation||{};
    for(const [key,label] of [['new','الحفظ'],['rec','المراجعة القريبة'],['far','المراجعة البعيدة']]){
      const t=sectionText(actual[key]);if(t)rows.push(`${label}: ${t}`);
    }
    return rows.slice(0,3);
  }
  function assignmentItems(ses){
    if(!ses)return [];
    const out=[];
    for(const [key,icon,label] of [['new','📖','الحفظ الجديد'],['rec','📚','المراجعة القريبة'],['far','📘','المراجعة البعيدة']]){
      const text=sectionText(ses[key]);if(text)out.push({icon,label,text});
    }
    const juz=[...(ses?.juz?.chips||[])].map(String).filter(Boolean);
    const surah=[...(ses?.surahReview?.chips||[])].map(String).filter(Boolean);
    if(juz.length)out.push({icon:'📜',label:'مراجعة الأجزاء',text:juz.join('، ')});
    if(surah.length)out.push({icon:'🕌',label:'مراجعة السور',text:surah.join('، ')});
    const carry=(ses?.carryForward?.items||[]).map(x=>String(x?.label||x?.surahName||'').trim()).filter(Boolean);
    if(carry.length)out.push({icon:'🔄',label:'إعادة وتثبيت',text:carry.join('، ')});
    return out.slice(0,8);
  }
  function recentSessions(studentId,limit=8){
    return (Array.isArray(g.sessions)?g.sessions:[]).filter(x=>x.studentId===studentId).slice().sort((a,b)=>dateValue(b)-dateValue(a)).slice(0,limit).map(ses=>({
      date:dateLabel(ses),
      status:String(ses.status||'—'),
      score:ses.status==='حضر'?sessionAverage(ses):null,
      recitation:ses.status==='حضر'?actualText(ses):[]
    }));
  }
  function fallbackProgress(studentId){
    const cutoff=Date.now()-29*86400000;
    const rows=(Array.isArray(g.sessions)?g.sessions:[]).filter(x=>x.studentId===studentId&&dateValue(x)>=cutoff);
    const present=rows.filter(x=>x.status==='حضر'),absent=rows.filter(x=>x.status==='غاب');
    const vals=present.map(sessionAverage).filter(Number.isFinite);
    const mastery=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null;
    const eligible=present.length+absent.length;
    return {mastery,attendance:eligible?Math.round(present.length/eligible*100):null,repeats:0,newAyat:0,attention:[],trend:{label:'—'}};
  }
  function buildSnapshot(studentId){
    const st=(Array.isArray(g.students)?g.students:[]).find(x=>x.id===studentId);if(!st)throw new Error('STUDENT_NOT_FOUND');
    const rows=(Array.isArray(g.sessions)?g.sessions:[]).filter(x=>x.studentId===studentId&&x.status==='حضر').slice().sort((a,b)=>dateValue(b)-dateValue(a));
    const latest=rows.find(s=>assignmentItems(s).length)||rows[0]||null;
    let progress=null;
    try{progress=g.ImamApp?.StudentProgress?.calculate?.(studentId,30)||null;}catch(_){progress=null;}
    progress=progress||fallbackProgress(studentId);
    let quranProgress=null;
    try{if(typeof g.getQuranProgressPercent==='function')quranProgress=score(g.getQuranProgressPercent(studentId));}catch(_){quranProgress=null;}
    const attention=(progress.attention||[]).slice(0,4).map(x=>({label:String(x?.label||''),score:score(x?.score),grade:String(x?.grade||'')})).filter(x=>x.label);
    return {
      v:VERSION,
      generatedAt:new Date().toISOString(),
      academy:{name:String(g.settings?.circle||'أكاديمية الإمام لتحفيظ القرآن الكريم'),teacher:String(g.settings?.name||'')},
      student:{name:String(st.name||'طالب'),guardian:String(st.parent||''),group:String(st.group||''),level:String(st.level||'')},
      period:'آخر 30 يومًا',
      metrics:{mastery:score(progress.mastery),attendance:score(progress.attendance),repeats:Math.max(0,Number(progress.repeats)||0),newAyat:Math.max(0,Number(progress.newAyat)||0),quranProgress,trend:String(progress.trend?.label||'—')},
      assignment:{date:latest?dateLabel(latest):'—',items:assignmentItems(latest)},
      attention,
      recent:recentSessions(studentId,8)
    };
  }
  function encodeSnapshot(data){
    const json=JSON.stringify(data),bytes=new TextEncoder().encode(json);
    let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function portalUrl(studentId){
    const url=new URL('guardian-portal.html',g.location?.href||'http://localhost/index.html');
    url.hash='data='+encodeSnapshot(buildSnapshot(studentId));
    return url.toString();
  }
  function toastSafe(msg,type='info'){try{if(typeof g.toast==='function')g.toast(msg,type);}catch(_){}}
  function openPortal(studentId=g.curStId){
    if(!studentId){toastSafe('اختر الطالب أولًا','error');return null;}
    try{const url=portalUrl(studentId);g.open?.(url,'_blank','noopener');return url;}catch(err){console.error('[guardian portal]',err);toastSafe('تعذر إنشاء بوابة الطالب','error');return null;}
  }
  async function copyPortalLink(studentId=g.curStId){
    if(!studentId){toastSafe('اختر الطالب أولًا','error');return false;}
    try{
      const url=portalUrl(studentId);
      if(g.navigator?.clipboard?.writeText)await g.navigator.clipboard.writeText(url);
      else{const ta=g.document.createElement('textarea');ta.value=url;ta.style.position='fixed';ta.style.opacity='0';g.document.body.appendChild(ta);ta.select();g.document.execCommand?.('copy');ta.remove();}
      toastSafe('تم نسخ رابط البوابة','success');return true;
    }catch(err){console.error('[guardian portal copy]',err);toastSafe('تعذر نسخ الرابط','error');return false;}
  }
  function activeStudents(){return (Array.isArray(g.students)?g.students:[]).filter(st=>!st.studentStatus||st.studentStatus==='active');}
  function ensurePicker(){
    if(!g.document?.body||g.document.getElementById('v1010PortalModal'))return;
    const box=g.document.createElement('div');box.className='mo';box.id='v1010PortalModal';
    box.innerHTML=`<div class="mo-box v1010-portal-modal"><div class="mo-title"><div><span>👨‍👩‍👧 بوابة ولي الأمر / الطالب</span><small>نسخة قراءة فقط من آخر بيانات الطالب</small></div><button class="mo-x" onclick="v1010ClosePortalPicker()">✕</button></div><div class="v1010-portal-info"><b>المرحلة الأولى — بدون SQL جديد</b><p>الرابط يحمل ملخصًا ثابتًا داخل جزء الـ # من العنوان، ولا يحتوي رقم الهاتف أو المعرّفات الداخلية. أنشئ رابطًا جديدًا عندما تريد تحديث البيانات. وأي شخص يملك الرابط يستطيع قراءة هذه اللقطة، فلا تنشره علنًا.</p></div><div class="fld"><label for="v1010PortalStudent">الطالب</label><select id="v1010PortalStudent"></select></div><div class="v1010-portal-actions"><button class="btn btn-g" onclick="v1010OpenPickedPortal()">🌐 فتح المعاينة</button><button class="btn btn-out" onclick="v1010CopyPickedPortal()">🔗 نسخ الرابط</button></div></div>`;
    g.document.body.appendChild(box);
  }
  function fillPicker(selected=''){
    ensurePicker();const sel=g.document.getElementById('v1010PortalStudent');if(!sel)return;
    const list=activeStudents();const id=selected||g.curStId||list[0]?.id||'';
    sel.innerHTML=list.length?list.map(st=>`<option value="${esc(st.id)}" ${st.id===id?'selected':''}>${esc(st.name)}${st.group?` — ${esc(st.group)}`:''}</option>`).join(''):'<option value="">لا يوجد طلاب نشطون</option>';
  }
  function openPicker(selected='') {fillPicker(selected);g.document.getElementById('v1010PortalModal')?.classList.add('open');}
  function closePicker(){g.document.getElementById('v1010PortalModal')?.classList.remove('open');}
  function pickedId(){return g.document.getElementById('v1010PortalStudent')?.value||'';}
  function openPicked(){const id=pickedId();if(id)openPortal(id);else toastSafe('لا يوجد طالب محدد','error');}
  function copyPicked(){const id=pickedId();if(id)return copyPortalLink(id);toastSafe('لا يوجد طالب محدد','error');return false;}
  function openSelectedGuardian(){const id=g.document.getElementById('guardianPreviewStudent')?.value||'';if(id)openPortal(id);else openPicker();}

  function ensureProfileButton(){
    const host=g.document?.getElementById?.('profileActions');if(!host||host.querySelector('[data-v1010-portal-profile]'))return;
    const btn=g.document.createElement('button');btn.className='btn btn-wa btn-sm';btn.dataset.v1010PortalProfile='1';btn.setAttribute('onclick','v1010OpenPortal(curStId)');btn.textContent='👨‍👩‍👧 بوابة ولي الأمر';host.prepend(btn);
  }
  function ensureGuardianButton(){
    const host=g.document?.querySelector?.('.guardian-send-actions');if(!host||host.querySelector('[data-v1010-portal-guardian]'))return;
    const btn=g.document.createElement('button');btn.className='btn btn-out';btn.dataset.v1010PortalGuardian='1';btn.setAttribute('onclick','v1010OpenSelectedGuardianPortal()');btn.textContent='🌐 بوابة الطالب';host.appendChild(btn);
  }
  function ensureMoreItem(){
    const grid=g.document?.getElementById?.('v9MoreGrid');if(!grid||grid.querySelector('[data-v1010-portal-more]'))return;
    const btn=g.document.createElement('button');btn.className='v9-more-item';btn.dataset.v1010PortalMore='1';btn.setAttribute('onclick','closeV9More();v1010OpenPortalPicker()');
    const icon=typeof g.v9Icon==='function'?g.v9Icon('users'):'👨‍👩‍👧';btn.innerHTML=`${icon}<b>بوابة ولي الأمر</b><small>عرض ومشاركة تقدم الطالب للقراءة فقط</small>`;grid.appendChild(btn);
  }
  function patchHooks(){
    const currentInject=g.injectV9Navigation;
    if(typeof currentInject==='function'&&!currentInject.__v1010PortalPatched){
      const wrapped=function(){const r=currentInject.apply(this,arguments);setTimeout(()=>{ensureMoreItem();ensureGuardianButton();},0);return r;};
      wrapped.__v1010PortalPatched=true;g.injectV9Navigation=wrapped;
    }
    const currentOpenProf=g.openProf;
    if(typeof currentOpenProf==='function'&&!currentOpenProf.__v1010PortalPatched){
      const wrapped=function(id){const r=currentOpenProf.apply(this,arguments);setTimeout(ensureProfileButton,0);return r;};
      wrapped.__v1010PortalPatched=true;g.openProf=wrapped;
    }
  }
  function init(){ensurePicker();patchHooks();ensureMoreItem();ensureProfileButton();ensureGuardianButton();}

  Object.assign(g,{v1010BuildPortalSnapshot:buildSnapshot,v1010PortalUrl:portalUrl,v1010OpenPortal:openPortal,v1010CopyPortalLink:copyPortalLink,v1010OpenPortalPicker:openPicker,v1010ClosePortalPicker:closePicker,v1010OpenPickedPortal:openPicked,v1010CopyPickedPortal:copyPicked,v1010OpenSelectedGuardianPortal:openSelectedGuardian});
  g.ImamApp=g.ImamApp||{};g.ImamApp.GuardianPortal=Object.freeze({buildSnapshot,portalUrl,open:openPortal,copyLink:copyPortalLink});
  if(g.document?.readyState==='loading')g.document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);
})(globalThis);
