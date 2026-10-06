'use strict';
/* أكاديمية الإمام v10 — data-model + session workflow extension */
const V10={reviewResults:{},accordion:{errors:false,suggestion:false},library:{hadithFilter:'الكل',duaFilter:'الكل'},mushafDownload:null,homeEnhanceQueued:false};
const V10_DATA=globalThis.ImamApp?.V10Data;
if(!V10_DATA)throw new Error('ImamApp.V10Data is required before v10.js');
const V10_JUZ_RANGES=V10_DATA.juzRanges;
const V10_THEMES=V10_DATA.themes;
const V10_HADITH=V10_DATA.hadith;
const V10_DUA=V10_DATA.dua;
const v10Id=(p='x')=>globalThis.ImamApp.Utils.makeId(p);
const v10Esc=x=>globalThis.ImamApp.Utils.escapeHtml(x);
const v10NormalizeGrade=g=>globalThis.ImamApp.Utils.normalizeGrade(g);
const V1051_CARRY=globalThis.ImamApp?.RecitationCarry;
if(!V1051_CARRY)throw new Error('ImamApp.RecitationCarry is required before v10.js');
const V1052_STRUCTURE=globalThis.ImamApp?.QuranStructure;
if(!V1052_STRUCTURE)throw new Error('ImamApp.QuranStructure is required before v10.js');
const V1051_GRADE_CHOICES=[
  {value:'ممتاز',label:'ممتاز ⭐⭐⭐'},
  {value:'جيد جداً',label:'جيد جدًا ⭐⭐'},
  {value:'جيد',label:'جيد ⭐'},
  {value:'ضعيف',label:'يحتاج متابعة 😕'},
  {value:'إعادة',label:'إعادة 🔄'}
];
const V1052_BASE_RENDER_SESSION_JOURNEY=globalThis.renderSessionJourney;
const V1052_BASE_RENDER_REVIEW_SUGGESTIONS=globalThis.renderReviewSuggestions;
const V1052_BASE_RENDER_JUZ_CHIPS=globalThis.renderJuzChips;

function v1051NormalizeJuzChip(raw){const parsed=V1051_CARRY.parseJuzChip(raw,JZ);return parsed?V1051_CARRY.quarterChip(parsed.juzName,parsed.quarter):'';}
function v1052JuzNoFromValue(value){const i=Number(value);return Number.isInteger(i)&&i>=0&&i<JZ.length?i+1:0;}
function v1052JuzUnitOptions(juzNo){
  if(!(juzNo>=1&&juzNo<=30))return [{value:'all',label:'الجزء كاملًا — حزبان — 8 أرباع'}];
  const out=[{value:'all',label:'الجزء كاملًا — حزبان — 8 أرباع'}];
  out.push({value:'h1',label:V1052_STRUCTURE.hizbLabel(juzNo,1)});
  out.push({value:'h2',label:V1052_STRUCTURE.hizbLabel(juzNo,2)});
  for(let q=1;q<=8;q++)out.push({value:`q${q}`,label:V1052_STRUCTURE.quarterLabel(juzNo,q)});
  return out;
}
function v1052RefreshJuzUnitOptions(){
  const sel=document.getElementById('juz-j'),qSel=document.getElementById('v1051-juz-quarter');if(!qSel)return;
  const juzNo=v1052JuzNoFromValue(sel?.value),current=qSel.value||'all',opts=v1052JuzUnitOptions(juzNo);
  qSel.innerHTML=opts.map(o=>`<option value="${v10Esc(o.value)}">${v10Esc(o.label)}</option>`).join('');
  qSel.value=opts.some(o=>o.value===current)?current:'all';
}
function v1052OnJuzChanged(){
  const sel=document.getElementById('juz-j'),juzNo=v1052JuzNoFromValue(sel?.value);v1052RefreshJuzUnitOptions();
  if(juzNo)V1052_STRUCTURE.primeJuz(juzNo).then(()=>v1052RefreshJuzUnitOptions()).catch(()=>{});
}
function v1051AddJuz(){
  const sel=document.getElementById('juz-j'),qSel=document.getElementById('v1051-juz-quarter');
  const v=sel?.value,juzNo=v1052JuzNoFromValue(v);if(!juzNo)return;
  const juzName=JZ[juzNo-1],mode=qSel?.value||'all',sameJuz=juzChips.map(x=>V1051_CARRY.parseJuzChip(x,JZ)).filter(Boolean).filter(x=>x.juzName===juzName);
  if(mode==='all'){
    juzChips=juzChips.filter(x=>V1051_CARRY.parseJuzChip(x,JZ)?.juzName!==juzName);
    juzChips.push(juzName);
  }else{
    if(sameJuz.some(x=>x.quarter==null)){toast('الجزء كاملًا مضاف بالفعل ويشمل الحزب والأرباع','info');return;}
    let quarters=[];
    if(mode==='h1')quarters=[1,2,3,4];
    else if(mode==='h2')quarters=[5,6,7,8];
    else if(/^q[1-8]$/.test(mode))quarters=[Number(mode.slice(1))];
    for(const q of quarters){const chip=V1051_CARRY.quarterChip(juzName,q);if(!juzChips.includes(chip))juzChips.push(chip);}
  }
  if(sel)sel.value='';v1052RefreshJuzUnitOptions();renderJuzChips();scheduleDraftSave();
}
function v10SurahItem(name,status='not_heard'){const n=String(name||'').replace(/^سورة\s+/,'').trim(),idx=S.findIndex(s=>s.n===n);if(idx<0)return null;return{id:`surah-${idx+1}`,type:'surah',surahId:idx+1,surahName:S[idx].n,label:`سورة ${S[idx].n}`,status,evaluation:'',grade:'',errors:[],notes:''};}
function v1051QuarterItem(juzName,quarter,status='not_heard'){const idx=JZ.indexOf(juzName);if(idx<0||quarter<1||quarter>8)return null;return{id:`juz-${idx+1}-q${quarter}`,type:'juz_quarter',juzIndex:idx+1,juzName,quarter,label:V1051_CARRY.quarterChip(juzName,quarter),status,evaluation:'',grade:'',errors:[],notes:''};}
function v10ExpandJuz(chip){const parsed=V1051_CARRY.parseJuzChip(chip,JZ);if(!parsed)return[];if(parsed.quarter)return[v1051QuarterItem(parsed.juzName,parsed.quarter)].filter(Boolean);return[1,2,3,4,5,6,7,8].map(q=>v1051QuarterItem(parsed.juzName,q)).filter(Boolean);}
function v10Assignment(type,name,chips=[]){let items=[];for(const chip0 of chips){const chip=String(chip0||'').trim(),jp=V1051_CARRY.parseJuzChip(chip,JZ);if(type==='juz'||jp)items.push(...v10ExpandJuz(chip));else{const it=v10SurahItem(chip);if(it)items.push(it);}}const seen=new Set();items=items.filter(i=>!seen.has(i.id)&&seen.add(i.id));return{id:v10Id('rev'),type,groupId:type==='juz'?name.replace(/\s+/g,'-'):v10Id('group'),groupName:name,items};}
function v10Migrate(){
  let changed=false;
  if(!settings.v10||typeof settings.v10!=='object'){settings.v10={};changed=true;}
  const homeDefaults={primary:true,stats:true,actions:true,students:false},oldHome=settings.v10.homeSections&&typeof settings.v10.homeSections==='object'?settings.v10.homeSections:{};
  settings.v10.homeSections={...homeDefaults,...oldHome};
  if(Object.keys(homeDefaults).some(k=>typeof oldHome[k]!=='boolean'))changed=true;
  if(!settings.v10.layout1052){settings.v10.homeSections.students=false;settings.v10.sessionPanels={stop:false,review:false};settings.v10.layout1052=true;changed=true;}
  else settings.v10.sessionPanels={stop:false,review:false,...(settings.v10.sessionPanels||{})};
  // v10.5.3: reset Today's Students once so the new compact home actually starts closed.
  if(!settings.v10.layout1053){settings.v10.homeSections.students=false;settings.v10.layout1053=true;changed=true;}
  if(!Object.prototype.hasOwnProperty.call(settings,'facebookUrl')){settings.facebookUrl='https://www.facebook.com/AlImamEdu';changed=true;}
  if(!V10_THEMES[settings.themePalette]){settings.themePalette='A';changed=true;}
  if(!settings.contentAssignments||typeof settings.contentAssignments!=='object'){settings.contentAssignments={};changed=true;}
  for(const ses of sessions){
    if(!Array.isArray(ses.reviewAssignments)){const arr=[];if(ses.juz?.chips?.length)arr.push(v10Assignment('juz','مراجعة الأجزاء',ses.juz.chips));if(ses.surahReview?.chips?.length)arr.push(v10Assignment('surah_group','مراجعة السور',ses.surahReview.chips));ses.reviewAssignments=arr;changed=true;}
    if(!Array.isArray(ses.reviewResults)){ses.reviewResults=[];changed=true;}
  }
  if(changed)save();applyV10Theme(settings.themePalette);return changed;
}
function applyV10Theme(key='A'){const t=V10_THEMES[key]||V10_THEMES.A,root=document.documentElement;root.style.setProperty('--gm',t.p);root.style.setProperty('--gd',t.d);root.style.setProperty('--gold',t.a);root.style.setProperty('--bg',t.bg);/* v9.2 owns the visible shell, so feed the selected palette into its semantic tokens too. */if(root.dataset.theme!=='dark'){root.style.setProperty('--v9-primary',t.p);root.style.setProperty('--v9-primary-2',t.d);root.style.setProperty('--v9-gold',t.a);root.style.setProperty('--v9-bg',t.bg);}document.querySelector('meta[name="theme-color"]')?.setAttribute('content',root.dataset.theme==='dark'?'#101613':t.p);settings.themePalette=key;}
function setV10Theme(key){applyV10Theme(key);save();renderV10ThemeSettings();}
function v10Accordion(id,title,body,open=false,extra=''){return `<section class="v10-accordion ${open?'open':''}" id="${id}"><button type="button" aria-expanded="${open}" onclick="toggleV10Accordion('${id}')"><span>${title}</span><span class="v10-chevron">⌄</span></button><div class="v10-accordion-body">${extra}${body}</div></section>`;}
function toggleV10Accordion(id){const el=document.getElementById(id);if(!el)return;const open=!el.classList.contains('open');el.classList.toggle('open',open);el.querySelector(':scope > button')?.setAttribute('aria-expanded',String(open));V10.accordion[id==='v10ErrorsAccordion'?'errors':'suggestion']=open;scheduleDraftSave?.();}
function enhanceSessionAccordions(){const card=document.getElementById('sessionErrorsCard');if(card&&!card.dataset.v10){card.dataset.v10='1';card.classList.add('v10-accordion');card.id='v10ErrorsAccordion';const children=[...card.children];card.innerHTML=`<button type="button" aria-expanded="false" onclick="toggleV10Accordion('v10ErrorsAccordion')"><span>سجل أخطاء التسميع <small class="txt-mut" id="errorCountLabel">0 خطأ</small></span><span class="v10-chevron">⌄</span></button><div class="v10-accordion-body"></div>`;const body=card.querySelector('.v10-accordion-body');children.forEach(c=>{if(c.querySelector?.('#errorCountLabel'))c.remove();else body.appendChild(c);});}
 const target=document.querySelector('#prevCard');if(target&&!document.getElementById('v10SuggestionAccordion'))target.insertAdjacentHTML('afterend',v10Accordion('v10SuggestionAccordion','ما سيُعاد تلقائيًا','<div id="v10SuggestionBody" class="v10-empty">سيظهر هنا تلقائيًا ما يحتاج إعادة أو لم يُسمع، مع بقاء القرار النهائي للمحفظ.</div>',false));}
function v10Prev(){const dateKey=document.getElementById('sesDate')?.value||localDateKey();return curStId?getPreviousPresentSession(curStId,dateKey,editingSessionId||''):null;}
function openQuranRangeText(sec){if(!sec?.surah)return toast('لا يوجد نطاق نص متاح','error');const idx=S.findIndex(s=>s.n===sec.surah);if(idx<0)return;V8.quranRange={chapter:idx+1,surah:sec.surah,from:Number(sec.from)||1,to:Number(sec.to)||S[idx].a,max:S[idx].a};document.getElementById('quranModalTitle').textContent=`📖 سورة ${sec.surah} — الآيات ${V8.quranRange.from} إلى ${V8.quranRange.to}`;document.getElementById('quranTextModal').classList.add('open');const content=document.getElementById('quranVerseContent');content.innerHTML='<div class="quran-load">جارٍ تحميل النص العثماني…</div>';fetchQpcHafsChapter(idx+1).then(all=>{V8.quranVerses=all.filter(v=>v.ayah>=V8.quranRange.from&&v.ayah<=V8.quranRange.to);content.innerHTML=V8.quranVerses.map(v=>`<span class="quran-ayah" data-ayah="${v.ayah}">${v10Esc(v.text)} <span class="quran-ayah-num">${v.ayah}</span></span>`).join(' ');setQuranPane?.('text');}).catch(()=>content.innerHTML='<div class="empty"><p>تعذر تحميل النص الآن، وإن كان محفوظًا Offline فسيُستخدم تلقائيًا عند توفره.</p></div>');}
function openPrevQuranText(key){const p=v10Prev();if(p?.[key])openQuranRangeText(p[key]);}
function repeatPrevAssignment(key){const p=v10Prev(),x=p?.[key];if(!x)return;if(['new','rec','far'].includes(key)){secOn[key]=true;updateTogs();document.getElementById(key+'-s').value=x.surah;fillAyah(key);document.getElementById(key+'-full').checked=!!x.full;toggleFull(key);if(!x.full){document.getElementById(key+'-f').value=x.from;document.getElementById(key+'-t').value=x.to;}document.getElementById(key+'-s').dataset.userTouched='1';}scheduleDraftSave();toast('تمت إضافة نفس التكليف للحصة القادمة — يمكنك تعديله قبل الحفظ','success');}
function setReviewItemGrade(groupId,itemId,grade){
  V10.reviewResults[groupId]=V10.reviewResults[groupId]||{};
  const normalized=V1051_CARRY.normalizeGrade(grade),status=normalized==='إعادة'?'repeat':V1051_CARRY.isPassingGrade(normalized)?'completed':normalized==='ضعيف'?'repeat':'not_heard';
  V10.reviewResults[groupId][itemId]={grade:normalized==='إعادة'?'':normalized,status,updatedAt:new Date().toISOString()};
  document.querySelectorAll(`[data-review-group="${CSS.escape(groupId)}"][data-review-item="${CSS.escape(itemId)}"] button[data-grade]`).forEach(b=>b.classList.toggle('on',b.dataset.grade===grade));
  updateReviewSuggestion();scheduleDraftSave();
}
function setReviewItemStatus(groupId,itemId,status){if(status==='completed')return setReviewItemGrade(groupId,itemId,'جيد');if(status==='repeat'||status==='not_heard')return setReviewItemGrade(groupId,itemId,'إعادة');}
function v1051ItemDisplay(it){if(it?.type==='juz_quarter'){const x=V1052_STRUCTURE.itemLabel(it);if(x)return x;}return it?.label||V1051_CARRY.itemLabel(it)||it?.surahName||'مقرر مراجعة';}
function v10ReviewGroupHTML(a){
  const result=V10.reviewResults[a.id]||{};
  return `<div class="v10-review-group"><h4>${v10Esc(a.groupName)}</h4><div class="v10-review-note">قيّم كل عنصر سمعه الطالب. أي عنصر تتركه بلا تقييم سيُسجل «لم يُسمع» ويُرحّل تلقائيًا للحصة القادمة.</div>${(a.items||[]).map(it=>{
    const r=result[it.id]||{},grade=V1051_CARRY.normalizeGrade(r.grade||r.evaluation||''),repeat=!grade&&(r.status==='repeat'||r.status==='not_heard');
    const textBtn=it.type==='surah'?`<button class="v10-text-btn" onclick="openQuranRangeText({surah:'${v10Esc(it.surahName)}',from:1,to:${S[it.surahId-1]?.a||1}})">📖 النص</button>`:'';
    return `<div class="v10-review-item" data-review-group="${v10Esc(a.id)}" data-review-item="${v10Esc(it.id)}"><div class="v10-review-name"><span>${v10Esc(v1051ItemDisplay(it))}</span>${textBtn}</div><div class="v1051-grade-grid">${V1051_GRADE_CHOICES.map(g=>{const on=g.value==='إعادة'?repeat:grade===g.value;return `<button type="button" data-grade="${v10Esc(g.value)}" class="${g.value==='إعادة'?'repeat ':''}${on?'on':''}" onclick="setReviewItemGrade('${v10Esc(a.id)}','${v10Esc(it.id)}','${v10Esc(g.value)}')">${v10Esc(g.label)}</button>`;}).join('')}</div></div>`;
  }).join('')}</div>`;
}
function v10LoadPrevTask(excludeId=''){if(!curStId)return;const dateKey=document.getElementById('sesDate')?.value||localDateKey(),prev=getPreviousPresentSession(curStId,dateKey,excludeId),el=document.getElementById('prevContent');actualRecitation={new:null,rec:null,far:null};V10.reviewResults={};const current=editingSessionId?sessions.find(x=>x.id===editingSessionId):null;for(const a of current?.reviewResults||[]){V10.reviewResults[a.id]={};for(const it of a.items||[])V10.reviewResults[a.id][it.id]={status:it.status||'not_heard',grade:V1051_CARRY.normalizeGrade(it.grade||it.evaluation||(it.status==='completed'?'جيد':''))};}if(!prev){el.innerHTML='<div class="txt-mut" style="padding:8px;text-align:center">لا توجد حصة سابقة</div>';updateReviewSuggestion();return;}const d=new Date(prev.date).toLocaleDateString('ar-EG',{weekday:'long',month:'long',day:'numeric'});let html=`<div class="txt-mut mb8">التكليف من حصة: ${d}</div>`;for(const [key,label] of [['new','الحفظ الجديد'],['rec','المراجعة القريبة'],['far','المراجعة البعيدة']]){const x=prev[key];if(!x)continue;actualRecitation[key]={surahId:x.surahId||S.findIndex(q=>q.n===x.surah)+1,surah:x.surah,from:Number(x.from)||1,to:Number(x.to)||Number(x.from)||1,full:!!x.full};const desc=x.full?`سورة ${v10Esc(x.surah)} كاملة`:`سورة ${v10Esc(x.surah)} من الآية ${v10Esc(x.from)} إلى الآية ${v10Esc(x.to)}`;html+=`<div class="prev-task-card" id="prev-task-${key}"><div class="v10-prev-head"><b>${label}</b><div class="v10-prev-tools"><button class="v10-text-btn" onclick="openPrevQuranText('${key}')">📖 النص</button></div></div><div class="assigned-range">المطلوب: ${desc}</div>${actualBlockHTML(key,x)}<div class="assessment-label">تقييم التسميع</div><div class="gbs" id="pgr-${key}">${['ممتاز','جيد جداً','جيد','ضعيف'].map(g=>`<div class="gb" data-g="${g}" onclick="setPrevGr('${key}','${g}')">${g==='ممتاز'?'⭐ ':''}${g}</div>`).join('')}</div><div id="v10-repeat-${key}"></div></div>`;}
 const ras=Array.isArray(prev.reviewAssignments)&&prev.reviewAssignments.length?prev.reviewAssignments:[...(prev.juz?.chips?.length?[v10Assignment('juz','مراجعة الأجزاء',prev.juz.chips)]:[]),...(prev.surahReview?.chips?.length?[v10Assignment('surah_group','مراجعة السور',prev.surahReview.chips)]:[])];if(ras.length)html+=ras.map(v10ReviewGroupHTML).join('');if(!prev.new&&!prev.rec&&!prev.far&&!ras.length)html+='<div class="txt-mut">لا يوجد تكليف للحصة السابقة</div>';el.innerHTML=html;['new','rec','far'].forEach(updateActualResult);paintPrevGrades();updateReviewSuggestion();}
function v10SetPrevGr(key,g){g=v10NormalizeGrade(g);prevGrades[key]=g;document.querySelectorAll(`#pgr-${key} .gb`).forEach(b=>b.classList.toggle('sel',b.dataset.g===g));const spot=document.getElementById('v10-repeat-'+key);if(spot)spot.innerHTML=g==='ضعيف'?`<button type="button" class="v10-inline-action v10-repeat-same" onclick="repeatPrevAssignment('${key}')">↺ نفس التكليف للحصة القادمة</button>`:'';if(g!=='ضعيف')smartContinueFromAssessment(key,g);else{const hint=document.getElementById(key+'-auto-hint');if(hint)hint.textContent='التقييم ضعيف: لن يكرر النظام التكليف تلقائيًا.';}scheduleDraftSave();}
function v1051PendingFromPrev(){const prev=v10Prev();return V1051_CARRY.pendingItems(prev?.reviewAssignments||[],V10.reviewResults);}
function updateReviewSuggestion(){
  const body=document.getElementById('v10SuggestionBody');if(!body)return;
  const pending=v1051PendingFromPrev();
  if(!pending.length){body.innerHTML='<div class="v10-empty">كل عناصر المراجعة التي تم تقييمها ناجحة. العناصر التي تُترك بلا تقييم ستُرحّل تلقائيًا عند الحفظ.</div>';return;}
  body.innerHTML=`<div class="v10-review-summary"><b>سيُرحّل تلقائيًا للحصة القادمة:</b><div class="v1051-review-summary-list">${pending.map(x=>`<div>${v10Esc(v1051ItemDisplay(x))} ${x._grade?`— ${v10Esc(v10WaGrade(x._grade))}`:'— لم يُسمع'}</div>`).join('')}</div></div><div class="v10-review-actions"><button class="btn btn-g btn-sm" onclick="applyRemainingReviewSuggestion()">إظهاره أيضًا في تكليف الحصة</button><button class="btn btn-out btn-sm" onclick="toggleV10Accordion('v10SuggestionAccordion')">إخفاء</button></div>`;
}
function v1051AddPendingToNextUI(items){
  let juzChanged=false,surahChanged=false;
  for(const it of items||[]){
    if(it.type==='juz_quarter'&&it.juzName&&it.quarter){const chip=V1051_CARRY.quarterChip(it.juzName,it.quarter);if(!juzChips.includes(chip)){juzChips.push(chip);juzChanged=true;}}
    else if(it.surahName){const chip='سورة '+it.surahName;if(!surahReviewChips.includes(chip)){surahReviewChips.push(chip);surahChanged=true;}}
  }
  if(juzChanged)secOn.juz=true;if(surahChanged)secOn.surahReview=true;updateTogs();renderChips();renderSurahChecklist();
}
function applyRemainingReviewSuggestion(){const pending=v1051PendingFromPrev();if(!pending.length)return toast('لا توجد عناصر تحتاج إعادة','info');v1051AddPendingToNextUI(pending);scheduleDraftSave();toast('تمت إضافة العناصر التي ستُعاد إلى التكليف القادم','success');}
function v10BuildReviewAssignmentsFromData(d){const out=[];if(d?.juz?.chips?.length)out.push(v10Assignment('juz','مراجعة الأجزاء',d.juz.chips));if(d?.surahReview?.chips?.length)out.push(v10Assignment('surah_group','مراجعة السور',d.surahReview.chips));return out;}
function v1051MergeJuzChips(baseChips,extraChips){
  const out=[];
  for(const raw of [...(baseChips||[]),...(extraChips||[])]){
    const parsed=V1051_CARRY.parseJuzChip(raw,JZ);if(!parsed)continue;
    const wholeAt=out.findIndex(x=>{const p=V1051_CARRY.parseJuzChip(x,JZ);return p?.juzName===parsed.juzName&&p.quarter==null;});
    if(parsed.quarter==null){for(let i=out.length-1;i>=0;i--){const p=V1051_CARRY.parseJuzChip(out[i],JZ);if(p?.juzName===parsed.juzName)out.splice(i,1);}out.push(parsed.juzName);continue;}
    if(wholeAt>=0)continue;
    const chip=V1051_CARRY.quarterChip(parsed.juzName,parsed.quarter);if(!out.includes(chip))out.push(chip);
  }
  return out;
}
function v1051MergeCarryIntoData(d,pending){
  const carry={juzChips:[],surahChips:[],items:[]};
  for(const it of pending||[]){
    if(it.type==='juz_quarter'&&it.juzName&&it.quarter)carry.juzChips.push(V1051_CARRY.quarterChip(it.juzName,it.quarter));
    else if(it.surahName)carry.surahChips.push('سورة '+it.surahName);
    carry.items.push({id:it.id,type:it.type,label:v1051ItemDisplay(it),juzName:it.juzName||'',quarter:it.quarter||null,surahName:it.surahName||'',status:it._status||'not_heard',grade:it._grade||''});
  }
  carry.juzChips=[...new Set(carry.juzChips)];carry.surahChips=[...new Set(carry.surahChips)];
  if(carry.juzChips.length)d.juz={...(d.juz||{}),chips:v1051MergeJuzChips(d.juz?.chips||[],carry.juzChips)};
  if(carry.surahChips.length)d.surahReview={...(d.surahReview||{}),chips:[...new Set([...(d.surahReview?.chips||[]),...carry.surahChips])]};
  d.carryForward=carry;return d;
}
function v10BuildReviewAssignments(){const d={};if(secOn.juz&&juzChips.length)d.juz={chips:[...juzChips]};if(secOn.surahReview&&surahReviewChips.length)d.surahReview={chips:[...surahReviewChips]};return v10BuildReviewAssignmentsFromData(d);}
function v10BuildSesData(){
  const d=globalThis.__IMAM_BASE__.buildSesData(),prev=v10Prev(),results=[];
  for(const a of prev?.reviewAssignments||[]){
    const map=V10.reviewResults[a.id]||{};
    results.push({...a,items:(a.items||[]).map(it=>{const r=map[it.id]||{},grade=V1051_CARRY.normalizeGrade(r.grade||r.evaluation||''),status=V1051_CARRY.resultStatus(r);return{...it,grade,evaluation:grade,status};})});
  }
  d.reviewResults=results;
  const pending=V1051_CARRY.pendingItems(prev?.reviewAssignments||[],V10.reviewResults);
  v1051MergeCarryIntoData(d,pending);
  d.reviewAssignments=v10BuildReviewAssignmentsFromData(d);
  return d;
}
function v10CaptureDraft(){const d=globalThis.__IMAM_BASE__.captureDraft();d.v10ReviewResults=JSON.parse(JSON.stringify(V10.reviewResults));d.v10Accordion={...V10.accordion};return d;}
function v10ApplyDraft(d){
  globalThis.__IMAM_BASE__.applyDraft(d);const restoredResults=d?.v10ReviewResults||{};V10.reviewResults=restoredResults;V10.accordion={errors:false,suggestion:false,...(d?.v10Accordion||{})};
  setTimeout(()=>{loadPrevTask(editingSessionId||'');V10.reviewResults=restoredResults;document.querySelectorAll('.v10-review-item').forEach(row=>{const g=row.dataset.reviewGroup,i=row.dataset.reviewItem,r=V10.reviewResults[g]?.[i]||{},grade=V1051_CARRY.normalizeGrade(r.grade||r.evaluation||''),repeat=!grade&&(r.status==='repeat'||r.status==='not_heard');row.querySelectorAll('button[data-grade]').forEach(b=>b.classList.toggle('on',b.dataset.grade==='إعادة'?repeat:b.dataset.grade===grade));});updateReviewSuggestion();for(const [id,k] of [['v10ErrorsAccordion','errors'],['v10SuggestionAccordion','suggestion']]){const e=document.getElementById(id);if(e){e.classList.toggle('open',!!V10.accordion[k]);e.querySelector(':scope > button')?.setAttribute('aria-expanded',String(!!V10.accordion[k]));}}},0);
}

// ──────────────────────────────────────
// v10.1 Home progressive disclosure + robust Surah dropdowns
// ──────────────────────────────────────
const V10_HOME_SECTIONS=[
 {key:'primary',selector:'.v92-primary-card',title:'الحصة التالية'},
 {key:'stats',selector:'.v92-stats',title:'ملخص اليوم'},
 {key:'actions',selector:'.v92-actions',title:'اختصارات العمل'}
];
function v1052HomeSummary(cfg,section){
  if(cfg.key!=='students')return `<span>${cfg.title}</span><span class="v10-home-chevron" aria-hidden="true">⌄</span>`;
  const rows=section?.querySelectorAll?.('.v92-today-student')?.length||0;
  const pending=[...(section?.querySelectorAll?.('.v92-state.neutral')||[])].length;
  return `<span class="v1052-home-summary-main"><b>👥 طلاب اليوم</b><small>${rows?`${rows} طالب${pending?` · ${pending} لم يبدأ`:''}`:'اضغط لعرض الطلاب'}</small></span><span class="v1052-home-summary-action">فتح <span class="v10-home-chevron" aria-hidden="true">⌄</span></span>`;
}
async function v1052RefreshMushafQuickStatus(){
  const status=document.getElementById('v1053HomeMushafStatus')||document.getElementById('v1052MushafStatus');
  const download=document.getElementById('v1053HomeMushafDownload');
  const downloadText=document.getElementById('v1053HomeMushafDownloadText');
  try{
    const api=globalThis.ImamApp?.MushafOffline;
    const s=api?.stats?await api.stats():{count:0,bytes:0};
    const count=Number(s?.count||0),total=Number(api?.pageCount||604);
    if(status){
      status.textContent=count>=total?`المصحف كامل محفوظ Offline · ${total} صفحة`:count?`${count}/${total} صفحة محفوظة — الباقي يُعرض من الإنترنت`:'جاهز للقراءة من الإنترنت — يمكنك تنزيل الصفحات للعمل Offline';
      status.dataset.ready=count>=total?'1':'0';
    }
    if(download){
      download.hidden=count>=total;download.style.display=count>=total?'none':'';
      if(downloadText)downloadText.textContent=count?`استكمال التنزيل ${count}/${total}`:'تنزيل المصحف Offline';
    }
  }catch(_){if(status)status.textContent='افتح المصحف أو نزّل صفحاته عند الحاجة';}
}
function v1052OpenMushafQuick(){
  const api=globalThis.ImamApp?.MushafOffline;
  if(api?.openTeacherReader)return api.openTeacherReader();
  if(typeof goPage==='function')goPage('mushaf');
}
function v1052DownloadMushafQuick(){
  const api=globalThis.ImamApp?.MushafOffline;
  if(api?.downloadAll)return api.downloadAll();
  if(typeof goPage==='function')goPage('mushaf');
}
function v1052EnsureMushafQuick(root){
  // v9.2 renders the single home Mushaf card. Do not insert a duplicate card.
  v1052RefreshMushafQuickStatus();
}
function enhanceV10HomeSections(){
  const root=document.getElementById('v9Home');if(!root)return;
  settings.v10=settings.v10||{};settings.v10.homeSections={primary:true,stats:true,actions:true,students:false,...(settings.v10.homeSections||{})};
  for(const cfg of V10_HOME_SECTIONS){
    const section=root.querySelector(cfg.selector);if(!section||section.closest('.v10-home-details'))continue;
    const details=document.createElement('details');details.className='v10-home-details v10-home-'+cfg.key;details.dataset.homeKey=cfg.key;details.open=settings.v10.homeSections[cfg.key]!==false;
    const summary=document.createElement('summary');summary.innerHTML=v1052HomeSummary(cfg,section);
    section.parentNode.insertBefore(details,section);details.append(summary,section);
    details.addEventListener('toggle',()=>{settings.v10=settings.v10||{};settings.v10.homeSections=settings.v10.homeSections||{};settings.v10.homeSections[cfg.key]=details.open;if(cfg.key==='students'){const a=summary.querySelector('.v1052-home-summary-action');if(a)a.childNodes[0].textContent=details.open?'إغلاق ':'فتح ';}try{save();}catch(_){}});
  }
  v1052EnsureMushafQuick(root);
}
function queueV10HomeEnhance(){if(V10.homeEnhanceQueued)return;V10.homeEnhanceQueued=true;requestAnimationFrame(()=>{V10.homeEnhanceQueued=false;enhanceV10HomeSections();});}
const V10_BASE_RENDER_HOME=globalThis.renderHome;
if(typeof V10_BASE_RENDER_HOME==='function')globalThis.renderHome=function(...args){const out=V10_BASE_RENDER_HOME.apply(this,args);queueV10HomeEnhance();return out;};

function v10SurahSearchValue(v){const fn=globalThis.v8NormArabic||globalThis.normalizeSurahName;return fn?fn(String(v||'')):String(v||'').trim();}
function v10PositionSurahDropdown(key){
 const input=document.getElementById(key+'-s'),el=document.getElementById(`${key}-surah-dropdown`);if(!input||!el||!el.classList.contains('open'))return;
 const r=input.getBoundingClientRect(),bottomNav=document.getElementById('v9Nav'),navTop=bottomNav&&getComputedStyle(bottomNav).position==='fixed'?bottomNav.getBoundingClientRect().top:window.innerHeight;
 const safeBottom=Math.min(window.innerHeight,navTop||window.innerHeight),below=Math.max(0,safeBottom-r.bottom-10),above=Math.max(0,r.top-10),up=below<220&&above>below;
 el.classList.toggle('open-up',up);const room=up?above:below;el.style.maxHeight=Math.max(150,Math.min(320,room-8))+'px';
}
function v10CloseOtherSurahDropdowns(exceptKey=''){document.querySelectorAll('.surah-dropdown.open').forEach(x=>{if(x.id!==`${exceptKey}-surah-dropdown`){x.classList.remove('open','open-up');x.style.maxHeight='';const k=x.id.replace(/-surah-dropdown$/,'');document.getElementById(k+'-s')?.setAttribute('aria-expanded','false');}});}
function v10OpenSurahDropdown(key){
 const input=document.getElementById(key+'-s'),el=document.getElementById(`${key}-surah-dropdown`);if(!input||!el)return;v10CloseOtherSurahDropdowns(key);filterSurahDropdown(key);el.classList.add('open');input.setAttribute('aria-expanded','true');requestAnimationFrame(()=>v10PositionSurahDropdown(key));
}
function v10CloseSurahDropdown(key,force=false){const el=document.getElementById(`${key}-surah-dropdown`),input=document.getElementById(key+'-s');if(!force&&input&&document.activeElement===input)return;if(el){el.classList.remove('open','open-up');el.style.maxHeight='';}input?.setAttribute('aria-expanded','false');}
function v10ToggleSurahDropdown(key){
 const el=document.getElementById(`${key}-surah-dropdown`),input=document.getElementById(key+'-s');if(!el)return;
 if(el.classList.contains('open')){closeSurahDropdown(key,true);return;}
 if(input&&document.activeElement!==input)input.focus({preventScroll:true});else openSurahDropdown(key);
}
function v10SelectSurahOption(key,i){if(!S[i])return;const input=document.getElementById(key+'-s');if(!input)return;input.value=S[i].n;input.dataset.userTouched='1';fillAyah(key);closeSurahDropdown(key,true);scheduleDraftSave();}
function v10FilterSurahDropdown(key){
 const input=document.getElementById(key+'-s'),el=document.getElementById(`${key}-surah-dropdown`);if(!input||!el)return;input.dataset.userTouched='1';
 const q=v10SurahSearchValue(input.value),rows=S.map((surah,i)=>({surah,i,n:v10SurahSearchValue(surah.n)})).filter(x=>!q||x.n.includes(q)||String(x.i+1)===q||String(x.i+1).startsWith(q)).slice(0,114);
 el.innerHTML=rows.map(({surah,i})=>`<button type="button" role="option" data-surah-index="${i}" onpointerdown="event.preventDefault();selectSurahOption('${key}',${i})" onclick="if(event.detail===0)selectSurahOption('${key}',${i})"><b>${i+1}</b><span>سورة ${v10Esc(surah.n)}</span><small>${surah.a} آية</small></button>`).join('')||'<div class="surah-dropdown-empty">لا توجد سورة مطابقة</div>';
 el.classList.add('open');el.setAttribute('role','listbox');input.setAttribute('aria-controls',`${key}-surah-dropdown`);input.setAttribute('aria-expanded','true');requestAnimationFrame(()=>v10PositionSurahDropdown(key));
}
function initV10SurahDropdowns(){
 ['new','rec','far'].forEach(key=>{const input=document.getElementById(key+'-s'),btn=input?.closest('.surah-combo')?.querySelector('.surah-drop-btn'),el=document.getElementById(`${key}-surah-dropdown`);if(!input||!el)return;input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-controls',`${key}-surah-dropdown`);if(btn)btn.setAttribute('aria-controls',`${key}-surah-dropdown`);});
 if(!document.documentElement.dataset.v10SurahResizeBound){document.documentElement.dataset.v10SurahResizeBound='1';window.addEventListener('resize',()=>['new','rec','far'].forEach(v10PositionSurahDropdown),{passive:true});window.addEventListener('scroll',()=>['new','rec','far'].forEach(v10PositionSurahDropdown),{passive:true,capture:true});}
}

function injectFacebookSetting(){const pg=document.getElementById('pg-settings');if(!pg||document.getElementById('v10FacebookSetting'))return;const el=document.createElement('div');el.className='card';el.id='v10FacebookSetting';el.innerHTML=`<div class="ch">🔗 التواصل والهوية</div><div class="fld"><label>رابط صفحة Facebook</label><input id="v10FacebookUrl" type="url" dir="ltr" placeholder="https://www.facebook.com/..." value="${v10Esc(settings.facebookUrl||'')}" oninput="settings.facebookUrl=this.value.trim();save()"></div>`;pg.prepend(el);}
function renderV10ThemeSettings(){const host=document.getElementById('v10ThemeSettings');if(!host)return;host.innerHTML=`<div class="ch">🎨 نمط الألوان</div><div class="v10-theme-grid">${Object.entries(V10_THEMES).map(([k,t])=>`<button class="v10-theme-choice ${settings.themePalette===k?'on':''}" onclick="setV10Theme('${k}')"><div class="v10-theme-swatch" style="background:${t.p}"></div><b>${k} — ${t.name}</b></button>`).join('')}</div>`;}
function injectThemeSettings(){const pg=document.getElementById('pg-settings');if(!pg||document.getElementById('v10ThemeSettings'))return;const el=document.createElement('div');el.className='card';el.id='v10ThemeSettings';pg.insertBefore(el,pg.children[1]||null);renderV10ThemeSettings();}
function v10AcademyFooter(){let x=`${settings.circle||ACADEMY_NAME}\n${ACADEMY_TAGLINE}`;if(settings.facebookUrl)x+=`\n\nتابعونا على فيسبوك:\n${settings.facebookUrl}`;return x;}
function v10WaGrade(g){const x=String(g||'').trim();if(x==='ممتاز')return 'ممتاز ⭐⭐⭐';if(x==='جيد جداً'||x==='جيد جدًا')return 'جيد جدًا ⭐⭐';if(x==='جيد')return 'جيد ⭐';if(x==='ضعيف')return 'يحتاج متابعة 😕';return x||'—';}
function v10WaSection(sec){if(!sec)return '';return sec.full?`سورة ${sec.surah} كاملة`:`سورة ${sec.surah} — الآيات ${sec.from}–${sec.to}`;}
function v1051GetAssessmentGrades(ses){
  const base=Object.values(ses?.prevGrades||{}).filter(Boolean).map(V1051_CARRY.normalizeGrade);
  const itemGrades=(ses?.reviewResults||[]).flatMap(a=>a.items||[]).map(it=>V1051_CARRY.normalizeGrade(it.grade||it.evaluation||'')).filter(Boolean);
  return [...base,...itemGrades];
}
function v1051ReviewResultLines(ses){
  const lines=[];
  for(const a of ses?.reviewResults||[]){for(const it of a.items||[]){const label=v1051ItemDisplay(it),grade=V1051_CARRY.normalizeGrade(it.grade||it.evaluation||''),status=it.status||V1051_CARRY.resultStatus(it);if(status==='completed')lines.push(`*${label}:* ${v10WaGrade(grade||'جيد')}`);else if(grade==='ضعيف')lines.push(`*${label}:* ${v10WaGrade(grade)}`);else lines.push(`*${label}:* إعادة 🔄`);}}
  return lines;
}
function v10BuildWAMsg(st,ses){
  const date=new Date(ses?.date||Date.now()).toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'}),pg=ses?.prevGrades||{};
  let msg=`السلام عليكم ورحمة الله وبركاته\n\n*تقرير حصة: ${st.name}*\n*التاريخ:* ${date}`;
  const assessed=[['new','الحفظ'],['rec','المراجعة القريبة'],['far','المراجعة البعيدة']].filter(([k])=>pg[k]);
  const reviewLines=v1051ReviewResultLines(ses);
  if(assessed.length||reviewLines.length||pg.juz||pg.surahReview){
    msg+='\n\n🎧 *نتيجة التسميع*';
    for(const [k,label] of assessed){const range=ses?.actualRecitation?.[k]||ses?.[k];msg+=`\n\n*${label}:* ${v10WaGrade(pg[k])}`;if(range)msg+=`\n${v10WaSection(range)}`;}
    if(pg.juz)msg+=`\n\n*مراجعة الأجزاء:* ${v10WaGrade(pg.juz)}`;
    if(pg.surahReview)msg+=`\n\n*مراجعة السور:* ${v10WaGrade(pg.surahReview)}`;
    if(reviewLines.length)msg+='\n\n'+reviewLines.join('\n');
  }
  msg+='\n\n📖 *التكليف للحصة القادمة*';
  let hasNext=false;
  if(ses?.new){hasNext=true;msg+=`\n*الحفظ:* ${v10WaSection(ses.new)}`;}
  if(ses?.rec){hasNext=true;msg+=`\n*المراجعة القريبة:* ${v10WaSection(ses.rec)}`;}
  if(ses?.far){hasNext=true;msg+=`\n*المراجعة البعيدة:* ${v10WaSection(ses.far)}`;}
  const carryJ=new Set(ses?.carryForward?.juzChips||[]),carryS=new Set(ses?.carryForward?.surahChips||[]);
  const nextJ=(ses?.juz?.chips||[]).filter(x=>!carryJ.has(x)),nextS=(ses?.surahReview?.chips||[]).filter(x=>!carryS.has(x));
  if(nextJ.length){hasNext=true;msg+=`\n*مراجعة الأجزاء:* ${nextJ.join('، ')}`;}
  if(nextS.length){hasNext=true;msg+=`\n*مراجعة السور:* ${nextS.join('، ')}`;}
  const carryItems=ses?.carryForward?.items||[];
  if(carryItems.length){hasNext=true;msg+=`\n*إعادة تلقائية 🔄:* ${carryItems.map(x=>x.label||x.surahName).filter(Boolean).join('، ')}`;}
  if(!hasNext)msg+='\nلا يوجد تكليف مسجل';
  if(ses?.notes?.trim())msg+=`\n\n📝 *ملاحظات المحفظ*\n${ses.notes.trim()}`;
  msg+='\n\nبارك الله في هذا الجهد، ونسأل الله مزيدًا من التوفيق والثبات 🌿';
  msg+=`\n\n──────────\n${v10AcademyFooter()}`;
  return msg;
}

function injectLibraries(){const more=document.getElementById('pg-more')||document.getElementById('pg-settings');if(!more||document.getElementById('v10Libraries'))return;const card=document.createElement('div');card.className='card';card.id='v10Libraries';card.innerHTML=`<div class="ch">📚 المحتوى التربوي</div><div class="settings-actions"><button class="btn btn-out btn-sm" onclick="openV10Library('hadith')">الحديث النبوي</button><button class="btn btn-out btn-sm" onclick="openV10Library('dua')">الأدعية والأذكار</button></div>`;more.prepend(card);if(!document.getElementById('v10LibraryModal'))document.body.insertAdjacentHTML('beforeend',`<div class="mo" id="v10LibraryModal"><div class="mo-box"><div class="mo-title"><span id="v10LibraryTitle">المكتبة</span><button class="mo-x" onclick="document.getElementById('v10LibraryModal').classList.remove('open')">✕</button></div><div class="v10-source-warning">المحتوى الظاهر هنا لا يُنشأ بالذكاء الاصطناعي. لا يُقبل أي عنصر دون مصدر ومرجع. النسخة الحالية تحتوي مجموعة بداية موثقة، وبنية المكتبة جاهزة لاستيراد المجموعة الكاملة بعد مراجعة المصدر.</div><div id="v10LibraryBody"></div></div></div>`);}
function openV10Library(type){V10.library.type=type;document.getElementById('v10LibraryTitle').textContent=type==='hadith'?'الحديث النبوي':'الأدعية والأذكار';renderV10Library();document.getElementById('v10LibraryModal').classList.add('open');}
function renderV10Library(){const type=V10.library.type||'hadith',data=type==='hadith'?V10_HADITH:V10_DUA,cats=['الكل',...new Set(data.map(x=>x.category))],f=type==='hadith'?V10.library.hadithFilter:V10.library.duaFilter,rows=data.filter(x=>f==='الكل'||x.category===f),body=document.getElementById('v10LibraryBody');body.innerHTML=`<div class="v10-library-tabs">${cats.map(c=>`<button class="${f===c?'on':''}" onclick="setV10LibraryFilter('${v10Esc(c)}')">${v10Esc(c)}</button>`).join('')}</div>${rows.map(x=>`<article class="v10-library-card"><div class="v10-arabic-text">«${v10Esc(x.text)}»</div><div class="v10-meta">${type==='hadith'?`الراوي: ${v10Esc(x.narrator)}<br>المصدر: ${v10Esc(x.source)}<br>رقم الحديث: ${v10Esc(x.hadithNumber)}<br>الدرجة: ${v10Esc(x.grade)}`:`المناسبة: ${v10Esc(x.occasion)}<br>المصدر: ${v10Esc(x.source)}<br>التكرار: ${x.repeatCount||1}` }<br>المرجع: ${v10Esc(x.reference)}</div><div class="v10-library-actions"><button class="btn btn-g btn-sm" onclick="assignV10Content('${type}','${v10Esc(x.id)}')">إضافة لطالب</button><button class="btn btn-out btn-sm" onclick="copyTextSafe('${v10Esc(x.text).replace(/'/g,"\\'")}').then(()=>toast('تم النسخ','success'))">نسخ</button></div></article>`).join('')||'<div class="v10-empty">لا توجد عناصر في هذا التصنيف.</div>'}`;}
function setV10LibraryFilter(c){if(V10.library.type==='hadith')V10.library.hadithFilter=c;else V10.library.duaFilter=c;renderV10Library();}
function assignV10Content(type,id){const data=type==='hadith'?V10_HADITH:V10_DUA,item=data.find(x=>x.id===id);if(!item)return;const names=students.filter(s=>!s.studentStatus||s.studentStatus==='active');const pick=prompt('اكتب رقم الطالب:\n'+names.map((s,i)=>`${i+1}) ${s.name}`).join('\n'));const st=names[Number(pick)-1];if(!st)return;settings.contentAssignments[st.id]=settings.contentAssignments[st.id]||{};settings.contentAssignments[st.id][type]={contentId:id,status:'learning',assignedAt:new Date().toISOString(),history:[]};save();toast(`تم تعيين ${type==='hadith'?'الحديث':'الدعاء'} للطالب ${st.name}`,'success');}
function injectProfileWeeklyContent(){if(!curStId)return;const host=document.getElementById('profHdr')?.parentElement;if(!host)return;document.getElementById('v10WeeklyContent')?.remove();const a=settings.contentAssignments?.[curStId];if(!a)return;const parts=[];for(const type of ['hadith','dua']){const as=a[type];if(!as)continue;const item=(type==='hadith'?V10_HADITH:V10_DUA).find(x=>x.id===as.contentId);if(item)parts.push(`<div><b>${type==='hadith'?'حديث الحفظ':'دعاء الأسبوع'}:</b> ${v10Esc(item.text)}<br><small>الحالة: ${as.status==='learning'?'قيد الحفظ':as.status}</small> <button class="v10-inline-action" onclick="gradeV10Content('${type}','completed')">✓ حفظه</button> <button class="v10-inline-action" onclick="gradeV10Content('${type}','repeat')">↺ يعاد</button></div>`);}if(parts.length)host.insertAdjacentHTML('afterbegin',`<div class="v10-weekly-card" id="v10WeeklyContent">${parts.join('<hr>')}</div>`);}
function gradeV10Content(type,status){const a=settings.contentAssignments?.[curStId]?.[type];if(!a)return;a.history=a.history||[];a.history.push({status,at:new Date().toISOString()});a.status=status==='completed'?'completed':'learning';save();injectProfileWeeklyContent();}
function injectMushafDirectDownload(){/* v9.2 already provides explicit external download + import fallback; preserve it and label the distinction clearly. */const el=document.getElementById('v9MushafApp');if(!el)return;setTimeout(()=>{const head=el.querySelector('.v92-mushaf-head');if(head&&!head.querySelector('.v10-source-warning'))head.insertAdjacentHTML('afterend','<div class="v10-source-warning"><b>نوع التنزيل:</b> الزر الحالي يفتح تنزيلًا خارجيًا ثم تستورد PDF داخل التطبيق. إذا منع المصدر CORS فلا يدّعي التطبيق وجود تنزيل مباشر داخلي أو Resume غير حقيقي.</div>');},0);}

// Explicit compatibility adapters. v10.2 no longer relies on declaration order for these overrides.
const V10_OVERRIDES={
  loadPrevTask:v10LoadPrevTask,
  setPrevGr:v10SetPrevGr,
  buildSesData:v10BuildSesData,
  captureDraft:v10CaptureDraft,
  applyDraft:v10ApplyDraft,
  openSurahDropdown:v10OpenSurahDropdown,
  closeSurahDropdown:v10CloseSurahDropdown,
  toggleSurahDropdown:v10ToggleSurahDropdown,
  selectSurahOption:v10SelectSurahOption,
  filterSurahDropdown:v10FilterSurahDropdown,
  academyFooter:v10AcademyFooter,
  buildWAMsg:v10BuildWAMsg,
  normalizeJuzChip:v1051NormalizeJuzChip,
  addJuz:v1051AddJuz,
  getAssessmentGrades:v1051GetAssessmentGrades
};
for(const [name,impl] of Object.entries(V10_OVERRIDES)){
  globalThis.ImamApp.Legacy.override(name,impl,'v10.2');
}

function initV10(){v10Migrate();enhanceSessionAccordions();initV10SurahDropdowns();injectFacebookSetting();injectThemeSettings();injectLibraries();queueV10HomeEnhance();if(curPage==='mushaf'){if(globalThis.ImamApp?.MushafOffline?.render)globalThis.ImamApp.MushafOffline.render();else renderV9Mushaf();}}
document.addEventListener('DOMContentLoaded',()=>setTimeout(initV10,50));
