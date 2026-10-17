'use strict';
/* v11.9.1: Standalone placement center. Reuses QuranStructure + RecitationCarry grading.
 * Stores teacher-verified test attempts on the existing student record; no schema migration.
 * A student's declaration is never treated as a passing assessment. */
(function(g){
  const root=g.ImamApp||(g.ImamApp={});
  const state={studentId:'',category:'surah',juz:1,selected:'surah:1',query:'',reader:[]};
  const q=id=>typeof document!=='undefined'?document.getElementById(id):null;
  const esc=v=>root.Utils?.escapeHtml?.(v)??String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const structure=()=>root.QuranStructure;
  const carry=()=>root.RecitationCarry;
  const surahs=()=>Array.isArray(g.S)?g.S:(typeof S!=='undefined'?S:[]);
  const juzNames=()=>Array.isArray(g.JZ)?g.JZ:(typeof JZ!=='undefined'?JZ:[]);
  const student=()=>((root.State?.students)||[]).find(x=>String(x.id)===String(state.studentId));
  function canAssess(){
    const auth=g.WeLiveQuranAuth;
    const role=String(auth?.getAccess?.()?.role||'');
    // Guardian and guest are never allowed, even while working offline.
    return !['parent','guardian','guest','student'].includes(role);
  }
  const normGrade=v=>carry()?.normalizeGrade?.(v)||String(v||'').trim();
  const gradePass=v=>carry()?.isPassingGrade?.(v)??['ممتاز','جيد جداً','جيد','جيد جدًا'].includes(v);
  const statusFor=grade=>gradePass(grade)?'completed':grade==='إعادة'||grade==='ضعيف'?'repeat':'not_heard';
  const grades=['ممتاز','جيد جداً','جيد','ضعيف','إعادة'];
  const gradeLabel=g=>g==='ضعيف'?'يحتاج متابعة':g==='جيد جداً'?'جيد جدًا':g||'لم يُسمّع';
  function items(category,juz=1){
    const list=surahs(),names=juzNames(),s=structure();
    if(category==='surah')return list.map((x,i)=>({key:`surah:${i+1}`,category,label:`سورة ${x.n}`,details:`${x.a} آية`,index:i+1}));
    if(category==='juz')return names.map((name,i)=>({key:`juz:${i+1}`,category,label:name,index:i+1,details:'ثمانية أرباع'}));
    const result=[];
    for(let j=1;j<=30;j++){
      if(juz&&j!==Number(juz))continue;
      if(category==='hizb')for(let h=1;h<=2;h++)result.push({key:`hizb:${(j-1)*2+h}`,category,index:(j-1)*2+h,juz:j,local:h,label:`الحزب ${(j-1)*2+h}`,details:s?.hizbLabel?.(j,h)||names[j-1]||''});
      if(category==='quarter')for(let r=1;r<=8;r++)result.push({key:`quarter:${(j-1)*8+r}`,category,index:(j-1)*8+r,juz:j,local:r,label:`الربع ${(j-1)*8+r}`,details:s?.quarterLabel?.(j,r)||names[j-1]||''});
    }
    return result;
  }
  function allFor(category){return items(category,category==='hizb'||category==='quarter'?null:1);}
  function latestResults(st){const map=new Map();for(const a of (st?.placementAssessments||[])){
      if(!a?.unitKey||!a?.id)continue;
      const prev=map.get(a.unitKey);
      if(!prev||String(a.at||'')>=String(prev.at||''))map.set(a.unitKey,a);
    }return map;}
  function summaryFor(unit,map){
    const result=map.get(unit.key);
    if(result)return {status:result.status||statusFor(normGrade(result.grade)),grade:normGrade(result.grade),direct:true,score:result.score};
    // Never infer passing a whole juz/hizb from one tested quarter. Only complete
    // coverage of every component allows a derived summary.
    if(unit.category==='hizb'||unit.category==='juz'){
      const start=unit.category==='juz'?(unit.index-1)*8+1:(unit.index-1)*4+1;
      const count=unit.category==='juz'?8:4;
      const subs=Array.from({length:count},(_,i)=>map.get(`quarter:${start+i}`));
      const verified=subs.filter(Boolean);
      if(verified.length===count){const pass=verified.every(x=>statusFor(normGrade(x.grade))==='completed');return{status:pass?'completed':'repeat',grade:pass?'اجتاز الأرباع':'توجد أرباع للإعادة',derived:true,score:null};}
      if(verified.length)return{status:'partial',grade:`اختُبر ${verified.length} من ${count} أرباع`,derived:true,score:null};
    }
    return {status:'not_heard',grade:'',score:null};
  }
  const stateLabel={completed:'اجتاز',repeat:'إعادة / تثبيت',partial:'اختبار جزئي',not_heard:'لم يُسمّع'};
  function normalizedSegments(unit){
    const list=surahs();const segments=[];
    if(!unit)return [];
    if(unit.category==='surah'){const s=list[unit.index-1];return s?[{surah:s.n,from:1,to:s.a,surahId:unit.index}]:[];}
    const start=unit.category==='quarter'?unit.index:unit.category==='hizb'?(unit.index-1)*4+1:(unit.index-1)*8+1;
    const qty=unit.category==='quarter'?1:unit.category==='hizb'?4:8;
    for(let i=0;i<qty;i++){
      const position=start+i,juz=Math.floor((position-1)/8)+1,r=((position-1)%8)+1;
      const part=root.RevisionQuranText?.segments?.(juz,r)||[];
      for(const x of part){const previous=segments.at(-1);if(previous&&previous.surah===x.surah&&previous.to+1===x.from)previous.to=x.to;else segments.push({surah:x.surah,surahId:x.chapter,from:x.from,to:x.to});}
    }
    return segments;
  }
  function today(){return new Date().toISOString().slice(0,10);}
  function newId(){return root.Utils?.makeId?.('placement')||`placement-${Date.now()}-${Math.random().toString(36).slice(2)}`;}
  function safeDate(v){const t=Date.parse(String(v||''));return Number.isFinite(t)?new Date(t).toLocaleDateString('ar-EG'):'—';}
  function gradeButtons(active=''){
    return grades.map(gr=>`<button type="button" class="pc-grade ${active===gr?'on':''}" data-grade="${esc(gr)}" aria-pressed="${active===gr?'true':'false'}">${gr==='ممتاز'?'⭐⭐⭐ ':gr==='جيد جداً'?'⭐⭐ ':gr==='جيد'?'⭐ ':gr==='إعادة'?'🔄 ':'😕 '}${gradeLabel(gr)}</button>`).join('');
  }
  function makePage(){if(q('pg-placement'))return;
    const page=document.createElement('div');page.id='pg-placement';page.className='pg';page.setAttribute('dir','rtl');
    page.innerHTML=`<div class="card pc-head"><div><h2>📋 تحديد مستوى الطالب</h2><p>اختبار المحفوظات السابقة · سور وأرباع وأحزاب وأجزاء · وفق تقديرات المراجعة الحالية</p></div><label>الطالب<select id="pcStudent"><option value="">— اختر الطالب —</option></select></label></div>
    <div class="card"><div id="pcDeclared" class="pc-declared"></div><div class="pc-categories" role="group" aria-label="تقسيم تحديد المستوى"><button data-cat="surah">السور (١١٤)</button><button data-cat="quarter">الأرباع (٢٤٠)</button><button data-cat="hizb">الأحزاب (٦٠)</button><button data-cat="juz">الأجزاء (٣٠)</button></div><div class="pc-filter"><label id="pcJuzWrap">اختر الجزء<select id="pcJuz"></select></label><label>البحث في المواضع<input id="pcSearch" type="search" placeholder="ابحث عن سورة أو جزء أو ربع"></label></div><div id="pcStats" class="pc-stats"></div></div>
    <div class="pc-columns"><section class="card"><h3>المواضع ونتائجها</h3><div id="pcItems" class="pc-items"></div></section><section class="card"><div id="pcEditor" class="pc-editor"></div></section></div>
    <section class="card"><h3>سجل المحاولات والتقييمات السابقة</h3><div id="pcHistory"></div></section>`;
    const studentsPage=q('pg-students');(studentsPage?.parentNode||document.body).insertBefore(page,studentsPage||null);
    const nav=q('mainNav');if(nav&&!q('pcNavTab')){
      const b=document.createElement('div');b.className='nav-t pc-nav';b.id='pcNavTab';b.setAttribute('role','button');b.tabIndex=0;b.innerHTML='<span class="ni">📋</span>تحديد المستوى';b.onclick=()=>g.goPage?.('placement');b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click();}};nav.appendChild(b);
    }
    page.addEventListener('click',clickPage);
    q('pcStudent').addEventListener('change',e=>{state.studentId=e.target.value;draw();});
    q('pcJuz').addEventListener('change',e=>{state.juz=Number(e.target.value)||1;draw();});
    q('pcSearch').addEventListener('input',e=>{state.query=e.target.value.trim();drawList();});
    const home=q('homeAnalysis');if(home&&!q('pcHomeOpen')){const btn=document.createElement('button');btn.id='pcHomeOpen';btn.type='button';btn.className='btn btn-out btn-sm';btn.textContent='📋 اختبار تحديد المستوى';btn.onclick=()=>open();home.insertAdjacentElement('afterend',btn);}
  }
  function open(studentId){if(!canAssess())return g.toast?.('تحديد المستوى للمحفظ والإدارة فقط','error');if(studentId)state.studentId=String(studentId);g.goPage?.('placement');draw();}
  function initNav(){
    const legacy=root.Legacy,go=g.goPage;
    if(legacy&&typeof go==='function')legacy.override('goPage',function(page,...args){if(page==='placement'&&!canAssess())return g.toast?.('غير مصرح بعرض اختبارات الطلاب','error');const r=go.call(this,page,...args);if(page==='placement'){
      const nav=q('pcNavTab');if(nav)nav.classList.add('on');const title=q('hdrTitle');if(title)title.textContent='تحديد المستوى';draw();
    }return r;},'v11.9.1-placement-center');
    const back=g.goBack;
    if(legacy&&typeof back==='function')legacy.override('goBack',function(...args){if(root.PlacementCenter?.isOpen?.())return g.goPage?.('students');return back.apply(this,args);},'v11.9.1-placement-back');
  }
  function isOpen(){return q('pg-placement')?.classList.contains('on')||false;}
  function initProfile(){const btn=q('im119PlacementBtn');if(!btn)return;
    btn.onclick=()=>open(root.State?.curStId);
    btn.textContent='📋 فتح تبويب تحديد المستوى';
  }
  function draw(){if(!q('pg-placement'))return;
    const list=root.State?.students||[];
    const sel=q('pcStudent');sel.innerHTML='<option value="">— اختر الطالب —</option>'+list.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(state.studentId)?'selected':''}>${esc(x.name)}</option>`).join('');
    if(state.studentId&&!student())state.studentId='';sel.value=state.studentId||'';
    q('pcJuz').innerHTML=Array.from({length:30},(_,i)=>`<option value="${i+1}" ${i+1===state.juz?'selected':''}>${esc(juzNames()[i]||`الجزء ${i+1}`)}</option>`).join('');
    q('pcJuzWrap').hidden=!['quarter','hizb'].includes(state.category);
    q('pcDeclared').innerHTML=student()?`<b>المحفوظات السابقة المصرّح بها:</b> ${esc(student().priorMemorization?.declared||'لم تُحدد')}<small>هذه ليست نتائج اختبار معتمدة.</small>`:'اختر الطالب لبدء الاختبار، ثم قيّم مواضع الحفظ السابقة.';
    q('pcSearch').value=state.query;
    q('pg-placement').querySelectorAll('[data-cat]').forEach(b=>{const on=b.dataset.cat===state.category;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
    drawList();drawHistory();
  }
  function drawnItems(){return items(state.category,['hizb','quarter'].includes(state.category)?state.juz:1).filter(x=>!state.query||(x.label+' '+x.details).includes(state.query));}
  function drawList(){const host=q('pcItems');if(!host)return;
    const st=student(),map=latestResults(st),all=items(state.category,['quarter','hizb'].includes(state.category)?state.juz:1),current=drawnItems();
    if(!current.some(x=>x.key===state.selected))state.selected=current[0]?.key||'';
    host.innerHTML=current.map(x=>{const r=summaryFor(x,map);return `<button type="button" data-unit="${x.key}" class="pc-unit ${state.selected===x.key?'selected':''}"><span><strong>${esc(x.label)}</strong><small>${esc(x.details)}</small></span><span class="pc-status ${r.status}">${esc(r.direct||r.derived?r.grade||stateLabel[r.status]:stateLabel[r.status])}</span></button>`;}).join('')||'<div class="empty">لا توجد مواضع مطابقة</div>';
    const allStats=all.map(x=>summaryFor(x,map));q('pcStats').innerHTML=`<span>المواضع: ${all.length}</span><span>اجتاز: ${allStats.filter(x=>x.status==='completed').length}</span><span>إعادة أو تثبيت: ${allStats.filter(x=>x.status==='repeat').length}</span><span>اختبار جزئي: ${allStats.filter(x=>x.status==='partial').length}</span><span>لم يُسمّع: ${allStats.filter(x=>x.status==='not_heard').length}</span>`;
    drawEditor();
  }
  function selectedUnit(){return allFor(state.category).find(x=>x.key===state.selected)||null;}
  function drawEditor(){const host=q('pcEditor');if(!host)return;const st=student(),unit=selectedUnit();
    if(!st){host.innerHTML='<p>اختر الطالب أولًا، ولا تبدأ تقييمًا قبل تحديد هويته.</p>';return;}
    if(!unit){host.innerHTML='<p>اختر موضعًا من القائمة.</p>';return;}
    const direct=latestResults(st).get(unit.key),status=summaryFor(unit,latestResults(st));
    host.dataset.grade=normGrade(direct?.grade||'');
    host.innerHTML=`<h3>تقييم ${esc(unit.label)}</h3><p>${esc(unit.details)}</p><p class="pc-hint">التقديرات المعتمدة في مراجعات التطبيق: ممتاز / جيد جدًا / جيد = اجتاز، يحتاج متابعة / إعادة = يعاد، وتركه بلا تقييم يعني لم يُسمّع.</p><div class="pc-current ${status.status}">النتيجة الحالية: <b>${esc(status.grade||stateLabel[status.status])}</b>${status.derived?'<small>نتيجة مشتقة من الأرباع المختبرة، وليست اختبارًا مستقلًا.</small>':''}</div><div class="pc-grades" id="pcGrades">${gradeButtons(direct?.grade||'')}</div><div class="pc-fields"><label>النسبة من ١٠٠ (اختيارية)<input id="pcScore" type="number" min="0" max="100" value="${direct?.score??''}" placeholder="0 — 100"></label><label>تاريخ الاختبار<input id="pcDate" type="date" value="${today()}"></label></div><label class="pc-note">ملاحظات المحفظ<textarea id="pcNote" rows="3" maxlength="500" placeholder="أسباب الإعادة أو جوانب الإتقان">${esc(direct?.note||'')}</textarea></label><div class="pc-actions"><button type="button" id="pcRead" class="btn btn-out btn-sm">📖 فتح نص الموضع</button><button type="button" id="pcSave" class="btn btn-g btn-sm">اعتماد نتيجة الاختبار</button></div><small>اختيار تقدير جديد يضيف محاولة جديدة إلى السجل دون حذف المحاولات السابقة. لا يتم اعتماد جزء أو حزب جزئي باعتباره مجتازًا كاملًا.</small>`;
  }
  function clickPage(e){const b=e.target.closest('button');if(!b)return;
    if(b.dataset.cat){state.category=b.dataset.cat;state.query='';state.selected='';draw();return;}
    if(b.dataset.unit){state.selected=b.dataset.unit;drawList();return;}
    if(b.dataset.grade){q('pcEditor').dataset.grade=b.dataset.grade;q('pcGrades').querySelectorAll('[data-grade]').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on));});return;}
    if(b.id==='pcRead')openText();if(b.id==='pcSave')saveAssessment();
  }
  function openText(){const unit=selectedUnit(),segments=normalizedSegments(unit);if(!segments.length)return g.toast?.('تعذر تحديد آيات الموضع','error');
    state.reader=segments;let nav=q('pcReaderNav');const modal=q('quranTextModal');if(modal){if(!nav){nav=document.createElement('nav');nav.id='pcReaderNav';nav.className='pc-reader-nav';modal.querySelector('#quranSourceNote')?.insertAdjacentElement('afterend',nav);}if(nav){nav.hidden=false;nav.innerHTML=segments.map((x,i)=>`<button type="button" data-part="${i}">${esc(x.surah)} (${x.from}–${x.to})</button>`).join('');nav.onclick=e=>{const k=Number(e.target.closest('[data-part]')?.dataset.part);if(Number.isInteger(k)&&segments[k])g.openQuranRangeText?.(segments[k]);};}}
    g.openQuranRangeText?.(segments[0]);
  }
  function saveAssessment(){if(!canAssess())return g.toast?.('غير مصرح بحفظ التقييم','error');const st=student(),unit=selectedUnit();if(!st||!unit)return g.toast?.('اختر الطالب والموضع أولًا','error');
    const grade=normGrade(q('pcEditor')?.dataset.grade||'');
    if(!grades.includes(grade))return g.toast?.('اختر التقدير من نفس تقديرات المراجعات أولًا','error');
    const scoreField=q('pcScore')?.value??'',score=scoreField.trim()===''?null:Number(scoreField);
    if(score!==null&&(!Number.isFinite(score)||score<0||score>100))return g.toast?.('النسبة يجب أن تكون بين صفر ومئة','error');
    const date=q('pcDate')?.value||'',note=q('pcNote')?.value.trim()||'';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date)))return g.toast?.('اختر تاريخًا صحيحًا للاختبار','error');
    const list=Array.isArray(st.placementAssessments)?st.placementAssessments:[],old=st.placementAssessments,oldUpdated=st.updatedAt;
    const attempt={id:newId(),unitKey:unit.key,category:unit.category,label:unit.label,grade,status:statusFor(grade),score,note,date,at:new Date().toISOString(),ranges:normalizedSegments(unit),teacherId:root.Auth?.currentUser?.()?.id||g.WeLiveQuranAuth?.getAccess?.()?.user?.id||null};
    st.placementAssessments=[...list,attempt];st.updatedAt=attempt.at;
    try{if(typeof g.save!=='function'||g.save()===false)throw new Error('SAVE_FAILED');}
    catch(_){st.placementAssessments=old;st.updatedAt=oldUpdated;g.toast?.('تعذر تأكيد حفظ الاختبار؛ لم تُعتمد النتيجة','error');return;}
    if(q('pcEditor'))delete q('pcEditor').dataset.grade;
    draw();g.toast?.('تم تسجيل نتيجة تحديد المستوى في سجل الطالب','success');
  }
  function drawHistory(){const host=q('pcHistory');if(!host)return;const attempts=(student()?.placementAssessments||[]).slice().reverse();
    host.innerHTML=attempts.length?`<div class="pc-history">${attempts.map(x=>`<div><b>${esc(x.label||x.unitKey)}</b><span class="pc-status ${esc(x.status)}">${esc(gradeLabel(x.grade))}</span><small>${esc(x.date||safeDate(x.at))} · ${x.score===null?'بلا نسبة':`${Number(x.score)}٪`}${x.note?' · '+esc(x.note):''}</small></div>`).join('')}</div>`:'<p class="pc-hint">لا توجد محاولات معتمدة بعد. المحفوظات المصرح بها لا تُحسب ضمن النتائج.</p>';
  }
  function init(){makePage();initNav();initProfile();
    const legacy=root.Legacy,originalClose=g.closeQuranTextModal;
    if(legacy&&typeof originalClose==='function')legacy.override('closeQuranTextModal',function(...args){const nav=q('pcReaderNav');if(nav)nav.hidden=true;return originalClose.apply(this,args);},'v11.9.1-placement-reader');
    document.addEventListener('click',e=>{if(e.target.closest('#im119PlacementBtn'))setTimeout(initProfile,0);},true);
  }
  root.PlacementCenter={open,items,allFor,latestResults,summaryFor,statusFor,normalizedSegments,gradePass,isOpen,draw};
  if(typeof module!=='undefined'&&module.exports)module.exports={items,allFor,latestResults,summaryFor,statusFor,normalizedSegments,gradePass};
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,240),{once:true});else setTimeout(init,240);}
})(typeof globalThis!=='undefined'?globalThis:this);
