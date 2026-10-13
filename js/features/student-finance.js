'use strict';
/* Imam Academy v11.5 Stage 1 — Teacher-only, offline-first monthly ledger.
   Additive student.studentFinance. No SQL, no guardian snapshot exposure.
   Currency: EGP, stored as integer piasters. Closed months are immutable. */
(function studentFinanceFeature(g){
  const MAX_MONEY=10000000000; // piasters; defensive limit on each entry
  const app=()=>g.ImamApp?.State||{};
  const students=()=>Array.isArray(app().students)?app().students:[];
  const sessions=()=>Array.isArray(app().sessions)?app().sessions:[];
  const studentById=id=>students().find(st=>String(st.id)===String(id));
  const esc=v=>g.ImamApp?.Utils?.escapeHtml?.(v??'')||String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad=n=>String(n).padStart(2,'0');
  const monthNow=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;};
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
  const monthOK=v=>/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(v||''));
  const dateOK=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return false;const d=new Date(`${v}T12:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;};
  const int=(value,fallback=0,max=MAX_MONEY)=>Number.isSafeInteger(Number(value))&&Number(value)>=0&&Number(value)<=max?Number(value):fallback;
  const signed=(value,fallback=0)=>Number.isSafeInteger(Number(value))&&Math.abs(Number(value))<=MAX_MONEY?Number(value):fallback;
  const amountText=cents=>(Number(cents||0)/100).toLocaleString('ar-EG',{minimumFractionDigits:2,maximumFractionDigits:2});
  const money=cents=>`${amountText(cents)} ج.م`;
  const inputMoney=cents=>(Number(cents||0)/100).toFixed(2);
  function toCents(value){
    const ascii=String(value??'').replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-0x0660)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-0x06F0)).replace(/٫/g,'.').trim();
    if(!/^\d{1,8}(?:\.\d{1,2})?$/.test(ascii))return null;
    const [p,k='']=ascii.split('.');const result=Number(p)*100+Number(k.padEnd(2,'0'));
    return result<=MAX_MONEY?result:null;
  }
  function signedCents(value){const str=String(value??'').trim();if(str.startsWith('-')){const amount=toCents(str.slice(1));return amount===null?null:-amount;}return toCents(str);}
  function monthDate(session){
    const raw=String(session?.sessionDate||session?.date||'');
    return dateOK(raw.slice(0,10))?raw.slice(0,10):'';
  }
  function monthSessions(studentId,month){
    if(!monthOK(month))return[];
    return sessions().filter(s=>String(s?.studentId)===String(studentId)&&monthDate(s).slice(0,7)===month);
  }
  const METHODS=Object.freeze({cash:'نقدي',transfer:'تحويل بنكي',instapay:'إنستاباي',wallet:'محفظة إلكترونية',other:'أخرى'});
  function cleanPayment(p){
    if(!p||typeof p!=='object')return null;
    const amountCents=int(p.amountCents,-1);
    if(amountCents<=0||!dateOK(p.date)||!/^pay-[a-zA-Z0-9._-]{1,100}$/.test(String(p.id||'')))return null;
    return {id:String(p.id),date:p.date,amountCents,method:METHODS[p.method]?p.method:'other',note:String(p.note||'').slice(0,350),createdAt:String(p.createdAt||'').slice(0,40),
      voidedAt:String(p.voidedAt||'').slice(0,40),voidReason:String(p.voidReason||'').slice(0,200)};
  }
  function cleanSnapshot(raw){
    if(!raw||typeof raw!=='object')return null;
    return {
      attendance:int(raw.attendance,0,100000),absence:int(raw.absence,0,100000),vacation:int(raw.vacation,0,100000),
      billedSessions:int(raw.billedSessions,0,100000),plannedSessions:int(raw.plannedSessions,0,1000),
      rateCents:int(raw.rateCents),openingCents:signed(raw.openingCents),discountCents:int(raw.discountCents),
      additionCents:int(raw.additionCents),dueCents:signed(raw.dueCents),paidCents:int(raw.paidCents),
      balanceCents:signed(raw.balanceCents),sessionFingerprint:String(raw.sessionFingerprint||'').slice(0,10000)
    };
  }
  function cleanFinance(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))return {rateCents:0,plannedSessions:0,chargeAbsence:false,months:{}};
    const out={rateCents:int(raw.rateCents),plannedSessions:int(raw.plannedSessions,0,1000),chargeAbsence:raw.chargeAbsence===true,months:{}};
    const source=raw.months&&typeof raw.months==='object'&&!Array.isArray(raw.months)?raw.months:{};
    Object.keys(source).filter(monthOK).sort().forEach(month=>{
      const row=source[month];if(!row||typeof row!=='object')return;
      const payments=Array.isArray(row.payments)?row.payments.map(cleanPayment).filter(x=>x&&x.date.slice(0,7)===month):[];
      const seen=new Set();const unique=payments.filter(p=>{if(seen.has(p.id))return false;seen.add(p.id);return true;});
      const closedAt=String(row.closedAt||'').slice(0,40);
      const closedSnapshot=closedAt?cleanSnapshot(row.closedSnapshot):null;
      out.months[month]={rateCents:int(row.rateCents,out.rateCents),plannedSessions:int(row.plannedSessions,out.plannedSessions,1000),chargeAbsence:row.chargeAbsence===true,
        openingCents:signed(row.openingCents),discountCents:int(row.discountCents),additionCents:int(row.additionCents),
        openingMode:row.openingMode==='auto'?'auto':'manual',payments:unique,closedAt:closedSnapshot?closedAt:'',closedSnapshot};
    });
    return out;
  }
  function financeFor(studentId){const st=studentById(studentId);return st?cleanFinance(st.studentFinance):null;}
  function previousMonth(month){if(!monthOK(month))return '';const [y,m]=month.split('-').map(Number);return m===1?`${y-1}-12`:`${y}-${pad(m-1)}`;}
  function derivedMonth(finance,month){
    const saved=finance.months[month];if(saved)return {...saved,payments:saved.payments.slice()};
    const prev=finance.months[previousMonth(month)];
    const carry=prev?.closedAt?prev.closedSnapshot?.balanceCents||0:0;
    return {rateCents:finance.rateCents,plannedSessions:finance.plannedSessions,chargeAbsence:finance.chargeAbsence,
      openingCents:carry,openingMode:prev?.closedAt?'auto':'manual',discountCents:0,additionCents:0,payments:[],closedAt:'',closedSnapshot:null};
  }
  function fingerprint(rows){const raw=rows.map(r=>`${String(r.id||'')}:${monthDate(r)}:${String(r.status||'')}`).sort().join('|');let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619);}return `${rows.length}:${(h>>>0).toString(16)}`;}
  function calculate(studentId,month=monthNow()){
    const finance=financeFor(studentId);if(!finance||!monthOK(month))return null;
    const ledger=derivedMonth(finance,month),rows=monthSessions(studentId,month);
    const attendance=rows.filter(s=>s.status==='حضر').length,absence=rows.filter(s=>s.status==='غاب').length,vacation=rows.filter(s=>s.status==='إجازة').length;
    const paidCents=ledger.payments.reduce((sum,p)=>sum+(p.voidedAt?0:p.amountCents),0);
    const billedSessions=attendance+(ledger.chargeAbsence?absence:0);
    const dueCents=billedSessions*ledger.rateCents+ledger.discountCents*-1+ledger.additionCents;
    const live={attendance,absence,vacation,billedSessions,plannedSessions:ledger.plannedSessions,
      rateCents:ledger.rateCents,openingCents:ledger.openingCents,discountCents:ledger.discountCents,
      additionCents:ledger.additionCents,dueCents,paidCents,balanceCents:ledger.openingCents+dueCents-paidCents,
      sessionFingerprint:fingerprint(rows)};
    const data=ledger.closedAt&&ledger.closedSnapshot?ledger.closedSnapshot:live;
    return {studentId,month,ledger,closed:!!ledger.closedAt,changedAfterClosing:!!ledger.closedAt&&live.sessionFingerprint!==data.sessionFingerprint,...data,
      payments:ledger.payments,live};
  }
  function touch(student){student.updatedAt=new Date().toISOString();if(app().settings?.sync?.deviceId)student.updatedByDevice=app().settings.sync.deviceId;g.save?.();}
  function ensureMutable(studentId,month){const st=studentById(studentId);if(!st||!monthOK(month))return null;const finance=cleanFinance(st.studentFinance);
    const ledger=derivedMonth(finance,month);if(ledger.closedAt)return null;
    finance.months[month]=ledger;return {st,finance,ledger};
  }
  function updateMonth(studentId,month,values){
    const next=ensureMutable(studentId,month);if(!next)return false;
    const {st,finance,ledger}=next;
    const moneyFields=['rateCents','discountCents','additionCents'];for(const field of moneyFields){if(!Number.isSafeInteger(values[field])||values[field]<0||values[field]>MAX_MONEY)return false;}
    if(!Number.isInteger(values.plannedSessions)||values.plannedSessions<0||values.plannedSessions>1000)return false;
    if(!Number.isSafeInteger(values.openingCents)||Math.abs(values.openingCents)>MAX_MONEY)return false;
    Object.assign(ledger,{rateCents:values.rateCents,plannedSessions:values.plannedSessions,chargeAbsence:!!values.chargeAbsence,
      discountCents:values.discountCents,additionCents:values.additionCents,openingCents:values.openingCents,openingMode:'manual'});
    // Default tariff updates future unsaved months; already saved months retain snapshots.
    finance.rateCents=ledger.rateCents;finance.plannedSessions=ledger.plannedSessions;finance.chargeAbsence=ledger.chargeAbsence;
    st.studentFinance=finance;touch(st);return true;
  }
  function addPayment(studentId,month,input){
    const amountCents=int(input?.amountCents,-1);
    if(amountCents<=0||!dateOK(input?.date)||input.date.slice(0,7)!==month||!METHODS[input?.method])return false;
    const next=ensureMutable(studentId,month);if(!next)return false;
    const {st,finance,ledger}=next;
    const id=g.ImamApp?.Utils?.makeId?.('pay')||`pay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    ledger.payments.push({id,date:input.date,amountCents,method:input.method,note:String(input.note||'').slice(0,350),createdAt:new Date().toISOString()});
    st.studentFinance=finance;touch(st);return true;
  }
  function voidPayment(studentId,month,paymentId,reason){
    if(!String(reason||'').trim())return false;
    const next=ensureMutable(studentId,month);if(!next)return false;
    const {st,finance,ledger}=next;
    const payment=ledger.payments.find(p=>p.id===String(paymentId));
    if(!payment||payment.voidedAt)return false;
    payment.voidedAt=new Date().toISOString();payment.voidReason=String(reason).trim().slice(0,200);
    st.studentFinance=finance;touch(st);return true;
  }
  function closeMonth(studentId,month){
    if(month>monthNow())return false;
    const next=ensureMutable(studentId,month);if(!next)return false;
    const {st,finance,ledger}=next;
    // Initialize month config before deriving final immutable figures.
    st.studentFinance=finance;
    const final=calculate(studentId,month);if(!final)return false;
    ledger.closedSnapshot={...final.live};ledger.closedAt=new Date().toISOString();
    st.studentFinance=finance;touch(st);return true;
  }
  const ui={studentId:'',month:monthNow(),editing:false};
  function $ (id){return document.getElementById(id);}
  function displayDate(v){return dateOK(v)?new Date(`${v}T12:00:00Z`).toLocaleDateString('ar-EG',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'—';}
  function monthLabel(month){return monthOK(month)?new Date(`${month}-01T12:00:00Z`).toLocaleDateString('ar-EG',{month:'long',year:'numeric',timeZone:'UTC'}):month;}
  function ensureCard(){
    let box=$('studentFinanceCard');if(box)return box;
    const anchor=$('profHist');if(!anchor)return null;
    box=document.createElement('section');box.id='studentFinanceCard';box.className='card student-finance-card v11-profile-section';
    anchor.insertAdjacentElement('beforebegin',box);
    box.addEventListener('click',event=>{
      const btn=event.target.closest('[data-fin-act]');if(!btn)return;
      const action=btn.dataset.finAct;
      if(action==='edit'){ui.editing=true;renderProfile();}
      if(action==='cancel'){ui.editing=false;renderProfile();}
      if(action==='save')saveFromForm();
      if(action==='payment')addFromForm();
      if(action==='close')closeFromForm();
      if(action==='void')voidFromForm(btn.dataset.finId);
    });
    box.addEventListener('change',event=>{if(event.target.id==='finMonth'){ui.month=event.target.value;ui.editing=false;renderProfile();}});
    return box;
  }
  const field=(label,id,value,options={})=>`<label class="fin-field"><span>${label}</span><input id="${id}" type="${options.type||'number'}" ${options.type==='number'?'min="0" step="0.01" inputmode="decimal"':''} value="${esc(value)}" ${options.disabled?'disabled':''} ${options.max?`max="${options.max}"`:''}></label>`;
  function renderProfile(id=String(app().curStId||'')){
    const box=ensureCard();if(!box)return;const st=studentById(id);
    if(!st){box.hidden=true;return;}box.hidden=false;
    if(ui.studentId!==String(id)){ui.studentId=String(id);ui.month=monthNow();ui.editing=false;}
    const s=calculate(id,ui.month);if(!s){box.innerHTML='<p>لا يمكن فتح الحساب المالي.</p>';return;}
    const {ledger}=s;
    const status=s.closed?'<span class="fin-pill closed">🔒 شهر مغلق</span>':'<span class="fin-pill">شهر مفتوح</span>';
    box.innerHTML=`<div class="fin-head"><div><div class="ch">💰 الحساب الشهري</div><small>بيانات خاصة بالمحفظ · الجنيه المصري · لا تُعرض لولي الأمر حاليًا</small></div>${status}</div>
      <div class="fin-period"><label for="finMonth">اختر الشهر</label><input type="month" id="finMonth" value="${esc(ui.month)}" min="2020-01" max="2099-12"></div>
      <div class="fin-stats"><div><strong>${s.attendance}</strong><span>حضور</span></div><div><strong>${s.absence}</strong><span>غياب</span></div><div><strong>${s.billedSessions}</strong><span>حصص محسوبة</span></div><div><strong>${s.plannedSessions||'—'}</strong><span>حصص مستهدفة</span></div></div>
      <div class="fin-balances"><div><small>المستحق عن الشهر</small><strong>${money(s.dueCents)}</strong></div><div><small>المدفوع</small><strong>${money(s.paidCents)}</strong></div><div><small>${s.balanceCents<0?'رصيد دائن للطالب':'المتبقي شامل الرصيد السابق'}</small><strong class="${s.balanceCents>0?'fin-owed':'fin-credit'}">${money(Math.abs(s.balanceCents))}</strong></div></div>
      ${s.closed?`<p class="fin-closed-msg">🔒 تم إغلاق شهر ${esc(monthLabel(s.month))} في ${esc(displayDate(s.ledger.closedAt.slice(0,10)))}. الأرقام محفوظة ولا تتغير بأثر رجعي.</p>${s.changedAfterClosing?'<p class="fin-warning">⚠️ تغيّرت سجلات الحصص بعد إغلاق الشهر. الكشف المغلق محفوظ كما كان؛ راجع الفروق يدويًا في الشهر التالي.</p>':''}`:''}
      <div class="fin-row"><span>سعر الحصة</span><b>${money(ledger.rateCents)}</b></div><div class="fin-row"><span>احتساب الغياب</span><b>${ledger.chargeAbsence?'نعم':'لا'}</b></div>
      <div class="fin-row"><span>الرصيد السابق</span><b>${money(ledger.openingCents)}</b></div><div class="fin-row"><span>خصم / إضافة</span><b>${money(ledger.discountCents)} / ${money(ledger.additionCents)}</b></div>
      ${!s.closed?`<div class="fin-buttons"><button type="button" data-fin-act="${ui.editing?'cancel':'edit'}">${ui.editing?'إلغاء التعديل':'⚙️ إعدادات الشهر'}</button></div>`:''}
      ${ui.editing&&!s.closed?`<div class="fin-editor"><p class="fin-hint">سعر الحصة الجديد سيصبح الافتراضي للأشهر الجديدة فقط. الأشهر المحفوظة والمغلقة لا تتغير تلقائيًا.</p>
         <div class="fin-grid">${field('سعر الحصة (ج.م)','finRate',inputMoney(ledger.rateCents))}${field('عدد الحصص الشهري المستهدف','finPlanned',ledger.plannedSessions,{max:1000})}${field('الخصم (ج.م)','finDiscount',inputMoney(ledger.discountCents))}${field('الإضافة (ج.م)','finAddition',inputMoney(ledger.additionCents))}</div>
         <label class="fin-field"><span>الرصيد السابق (ج.م، يمكن أن يكون دائنًا بالسالب)</span><input type="number" id="finOpening" step="0.01" inputmode="decimal" value="${esc((ledger.openingCents/100).toFixed(2))}"></label>
         <label class="fin-check"><input id="finChargeAbs" type="checkbox" ${ledger.chargeAbsence?'checked':''}> احتساب حصة الغياب ضمن المستحق</label>
         <button type="button" class="fin-primary" data-fin-act="save">حفظ إعدادات الشهر</button></div>`:''}
      <div class="fin-payments"><h3>💳 سجل الدفعات (${s.payments.length})</h3>${s.payments.length?`<div class="fin-pay-list">${s.payments.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(p=>`<div class="fin-payment ${p.voidedAt?'voided':''}"><span><b>${money(p.amountCents)}</b><small>${esc(displayDate(p.date))} · ${esc(METHODS[p.method])}</small>${p.note?`<small>${esc(p.note)}</small>`:''}${p.voidedAt?`<small class="fin-void-tag">ملغاة: ${esc(p.voidReason)}</small>`:''}</span>${!s.closed&&!p.voidedAt?`<button type="button" class="fin-void-btn" data-fin-act="void" data-fin-id="${esc(p.id)}">إلغاء الدفعة</button>`:`<span class="fin-ref">${esc(p.id.slice(-8))}</span>`}</div>`).join('')}</div>`:'<p class="fin-hint">لم يتم تسجيل دفعات لهذا الشهر.</p>'}</div>
      ${!s.closed?`<div class="fin-payment-form"><h3>إضافة دفعة</h3><div class="fin-grid">${field('المبلغ (ج.م)','finPayAmount','0.00')}${field('تاريخ الدفع','finPayDate',ui.month===monthNow()?today():ui.month+'-01',{type:'date'})}</div><label class="fin-field"><span>طريقة الدفع</span><select id="finPayMethod">${Object.entries(METHODS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label class="fin-field"><span>ملاحظات (اختياري)</span><input id="finPayNote" type="text" maxlength="350" placeholder="رقم إيصال أو توضيح"></label><button type="button" class="fin-primary" data-fin-act="payment">+ تسجيل الدفعة</button></div>
      <div class="fin-close"><p>إغلاق الشهر يثبت الكشف ماليًا ويمنع تعديل الإعدادات وإضافة دفعات إليه. الدفعات اللاحقة تُسجّل في شهرها الجديد.</p><button type="button" data-fin-act="close">🔒 إغلاق شهر ${esc(monthLabel(ui.month))}</button></div>`:''}`;
  }
  function show(text,type='info'){g.toast?.(text,type);}
  function saveFromForm(){
    const moneyFields=['finRate','finDiscount','finAddition'];const v=moneyFields.map(key=>toCents($(key)?.value));
    const n=Number($('finPlanned')?.value),opening=signedCents($('finOpening')?.value);
    if(v.some(x=>x===null)||!Number.isInteger(n)||n<0||n>1000||opening===null){show('راجع الأرقام: استخدم مبلغًا صحيحًا حتى منزلتين عشريتين','error');return;}
    const ok=updateMonth(ui.studentId,ui.month,{rateCents:v[0],discountCents:v[1],additionCents:v[2],plannedSessions:n,openingCents:opening,chargeAbsence:!!$('finChargeAbs')?.checked});
    if(!ok){show('تعذر حفظ الشهر (قد يكون مغلقًا)','error');return;}ui.editing=false;renderProfile();show('تم حفظ إعدادات الشهر','success');
  }
  function addFromForm(){
    if(ui.editing){show('احفظ إعدادات الشهر أو ألغِ التعديل أولًا','error');return;}
    const value=toCents($('finPayAmount')?.value),date=$('finPayDate')?.value,method=$('finPayMethod')?.value;
    if(!value||!dateOK(date)||date.slice(0,7)!==ui.month){show('أدخل مبلغًا موجبًا وتاريخًا داخل الشهر المحدد','error');return;}
    const amount=money(value);if(!g.confirm?.(`تأكيد تسجيل دفعة بقيمة ${amount} بتاريخ ${date}؟`))return;
    if(addPayment(ui.studentId,ui.month,{amountCents:value,date,method,note:$('finPayNote')?.value})){renderProfile();show('تم تسجيل الدفعة وحفظها','success');}else show('تعذر تسجيل الدفعة','error');
  }
  function voidFromForm(paymentId){
    if(ui.editing){show('احفظ إعدادات الشهر أو ألغِ التعديل أولًا','error');return;}
    const reason=g.prompt?.('سبب إلغاء الدفعة؟ (لن تُحذف من السجل)');
    if(!String(reason||'').trim())return;
    if(!g.confirm?.('هل تؤكد إلغاء الدفعة؟ ستظل ظاهرة في السجل مع سبب الإلغاء.'))return;
    if(voidPayment(ui.studentId,ui.month,paymentId,reason)){renderProfile();show('تم إلغاء الدفعة مع الاحتفاظ بسجلها','success');}
    else show('تعذر إلغاء الدفعة','error');
  }
  function closeFromForm(){
    if(ui.editing){show('احفظ إعدادات الشهر قبل إغلاقه','error');return;}
    const s=calculate(ui.studentId,ui.month);if(!s||s.closed)return;
    if(!g.confirm?.(`إغلاق حساب شهر ${monthLabel(ui.month)}؟\nالمستحق: ${money(s.dueCents)}\nالمدفوع: ${money(s.paidCents)}\nالمتبقي: ${money(s.balanceCents)}\n\nبعد الإغلاق لا يمكن تعديل هذا الشهر. تأكد من جميع الدفعات أولًا.`))return;
    if(closeMonth(ui.studentId,ui.month)){renderProfile();show('تم إغلاق الشهر وتثبيت الكشف','success');}else show('تعذر إغلاق الشهر','error');
  }
  function installHooks(){
    const legacy=g.ImamApp?.Legacy;
    const base=g.openProf;
    if(typeof base==='function'){
      const wrapped=function(id,...args){const out=base.call(this,id,...args);setTimeout(()=>renderProfile(id),0);return out;};
      if(legacy?.override)legacy.override('openProf',wrapped,'v11.5-finance-stage1');else g.openProf=wrapped;
    }
    // Import sanitizer removes unknown student fields; explicitly retain only validated financial data.
    const sanitize=g.sanitizeBackupData;
    if(typeof sanitize==='function'){
      const wrapped=function(d,...args){const clean=sanitize.call(this,d,...args);clean.students.forEach((st,i)=>{
        const raw=d.students?.find(x=>String(x?.id)===String(st.id))||d.students?.[i];
        if(raw?.studentFinance)st.studentFinance=cleanFinance(raw.studentFinance);
      });return clean;};
      if(legacy?.override)legacy.override('sanitizeBackupData',wrapped,'v11.5-finance-stage1');else g.sanitizeBackupData=wrapped;
    }
  }
  g.ImamApp=g.ImamApp||{};
  g.ImamApp.StudentFinance={cleanFinance,monthSessions,financeFor,calculate,updateMonth,addPayment,voidPayment,closeMonth,toCents,money,renderProfile};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHooks,{once:true});else installHooks();
})(globalThis);
