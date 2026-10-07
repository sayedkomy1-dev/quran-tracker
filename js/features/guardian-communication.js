/* We Live Quran v10.10.0 — Guardian Communication Center
 * Manual WhatsApp handoff only: the app prepares messages and opens WhatsApp.
 * Final send remains an explicit user action in WhatsApp.
 */
(function(){
  'use strict';

  const GC={mode:'session',scope:'none',group:'',previewId:'',invalid:[],valid:[]};
  const $=id=>document.getElementById(id);
  const safe=s=>typeof esc==='function'?esc(String(s??'')):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const today=()=>typeof localDateKey==='function'?localDateKey():new Date().toISOString().slice(0,10);
  const phoneOk=st=>/^20\d{10}$/.test(String(st?.phone||''));
  const activeStudentsGC=()=>students.filter(st=>!st.studentStatus||st.studentStatus==='active');
  const latestPresent=st=>sessions.filter(x=>x.studentId===st.id&&x.status==='حضر').sort((a,b)=>new Date(b.date)-new Date(a.date))[0]||null;
  const todayAbsentIds=()=>new Set(sessions.filter(x=>(x.sessionDate||String(x.date||'').slice(0,10))===today()&&x.status==='غاب').map(x=>x.studentId));

  function academyTail(){
    const lines=[];
    if(settings?.name)lines.push(`— ${settings.name}`);
    if(settings?.circle)lines.push(settings.circle);
    if(typeof ACADEMY_TAGLINE!=='undefined'&&ACADEMY_TAGLINE)lines.push(ACADEMY_TAGLINE);
    return lines.length?'\n\n'+lines.join('\n'):'';
  }

  function sectionText(sec){
    if(!sec)return'';
    if(sec.full)return `سورة ${sec.surah} كاملة`;
    if(sec.surah)return `سورة ${sec.surah} — الآيات ${sec.from||1}–${sec.to||sec.from||1}`;
    return'';
  }

  function assignmentLines(ses){
    const lines=[];
    if(ses?.new)lines.push(`📖 الحفظ: ${sectionText(ses.new)}`);
    if(ses?.rec)lines.push(`🔁 المراجعة القريبة: ${sectionText(ses.rec)}`);
    if(ses?.far)lines.push(`🔁 المراجعة البعيدة: ${sectionText(ses.far)}`);
    const j=[...(ses?.juz?.chips||[])];
    const sr=[...(ses?.surahReview?.chips||[])];
    const carry=(ses?.carryForward?.items||[]).map(x=>x.label||x.surahName).filter(Boolean);
    if(j.length)lines.push(`📚 مراجعة الأجزاء: ${j.join('، ')}`);
    if(sr.length)lines.push(`🕌 مراجعة السور: ${sr.join('، ')}`);
    if(carry.length)lines.push(`🔄 إعادة: ${carry.join('، ')}`);
    return lines;
  }

  function guardianMessage(st,mode=GC.mode){
    const ses=latestPresent(st);
    const d=new Date().toLocaleDateString('ar-EG',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    if(mode==='session'){
      if(!ses)return `السلام عليكم ورحمة الله وبركاته 🌿\n\nولي أمر الطالب *${st.name}*،\nلا توجد حصة مكتملة مسجلة بعد لإعداد تقرير.\n${academyTail()}`;
      return buildWAMsg(st,ses);
    }
    if(mode==='absence'){
      const lines=assignmentLines(ses);
      let msg=`السلام عليكم ورحمة الله وبركاته 🌿\n\nولي أمر الطالب *${st.name}*،\n\nنحيطكم علمًا بغياب الطالب عن حصة اليوم:\n*${d}*\n`;
      if(lines.length)msg+=`\n📌 *للمتابعة قبل الحصة القادمة*\n${lines.join('\n')}\n`;
      msg+=`\nنسأل الله له التوفيق، وننتظره في الحصة القادمة بإذن الله.`;
      return msg+academyTail();
    }
    if(mode==='assignment'){
      const lines=assignmentLines(ses);
      let msg=`السلام عليكم ورحمة الله وبركاته 🌿\n\nتذكير لولي أمر الطالب *${st.name}* بالتكليف القادم:`;
      msg+=lines.length?`\n\n${lines.join('\n')}`:`\n\nلا يوجد تكليف مسجل حاليًا.`;
      if(ses?.notes?.trim())msg+=`\n\n📝 *ملاحظة المحفظ*\n${ses.notes.trim()}`;
      msg+=`\n\nبارك الله في جهده ووفقه لإتقان كتاب الله.`;
      return msg+academyTail();
    }
    const raw=$('broadcastText')?.value||'';
    return personalizeBroadcast(raw,st);
  }

  function selectedStudents(){return activeStudentsGC().filter(st=>broadcastSelected.has(st.id));}
  function refreshValidation(){
    const selected=selectedStudents();
    GC.valid=selected.filter(phoneOk);GC.invalid=selected.filter(st=>!phoneOk(st));
    const count=$('broadcastCount');if(count)count.textContent=`${selected.length} محدد`;
    const valid=$('guardianValidCount');if(valid)valid.textContent=String(GC.valid.length);
    const invalid=$('guardianInvalidCount');if(invalid)invalid.textContent=String(GC.invalid.length);
    const box=$('guardianPhoneIssues');
    if(box){
      if(!GC.invalid.length){box.hidden=true;box.innerHTML='';}
      else{box.hidden=false;box.innerHTML=`<strong>⚠️ ${GC.invalid.length} رقم يحتاج مراجعة قبل الإرسال</strong><div>${GC.invalid.slice(0,6).map(st=>`<span>${safe(st.name)}</span>`).join('')}${GC.invalid.length>6?`<span>+${GC.invalid.length-6}</span>`:''}</div>`;}
    }
  }

  function setGuardianMode(mode){
    GC.mode=mode;
    document.querySelectorAll('[data-guardian-mode]').forEach(b=>b.classList.toggle('on',b.dataset.guardianMode===mode));
    const custom=$('guardianCustomPanel');if(custom)custom.hidden=mode!=='custom';
    const note=$('guardianModeHint');if(note){
      const hints={session:'يُنشئ تقرير آخر حصة مكتملة لكل طالب تلقائيًا.',absence:'رسالة غياب محترمة مع تذكير بالتكليف السابق.',assignment:'تذكير مباشر بالتكليف القادم لكل طالب.',custom:'رسالة واحدة قابلة للتخصيص باسم الطالب وولي الأمر.'};note.textContent=hints[mode]||'';
    }
    updateBroadcastPreview();
  }

  function populateGroups(){
    const sel=$('guardianGroup');if(!sel)return;
    const groups=[...new Set(activeStudentsGC().map(s=>String(s.group||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
    sel.innerHTML='<option value="">اختر المجموعة...</option>'+groups.map(g=>`<option value="${safe(g)}">${safe(g)}</option>`).join('');
  }

  function scopeIds(mode){
    const active=activeStudentsGC();
    if(mode==='all')return new Set(active.map(s=>s.id));
    if(mode==='today')return new Set((typeof expectedStudentsForDate==='function'?expectedStudentsForDate(today()):[]).map(s=>s.id));
    if(mode==='absent')return todayAbsentIds();
    if(mode==='group')return new Set(active.filter(s=>String(s.group||'')===String($('guardianGroup')?.value||'')).map(s=>s.id));
    return new Set();
  }

  function setBroadcastRecipients(mode){
    GC.scope=mode;
    if(mode!=='manual'){
      broadcastSelected=scopeIds(mode);
    }
    document.querySelectorAll('[data-guardian-scope]').forEach(b=>b.classList.toggle('on',b.dataset.guardianScope===mode));
    renderBroadcastRecipients();updateBroadcastPreview();
  }

  function renderBroadcastRecipients(){
    const el=$('broadcastRecipients');if(!el)return;
    const q=($('broadcastSearch')?.value||'').trim().toLowerCase();
    const rows=activeStudentsGC().filter(st=>!q||[st.name,st.parent,st.group,st.phone].some(v=>String(v||'').toLowerCase().includes(q)));
    el.innerHTML=rows.map(st=>{
      const valid=phoneOk(st),checked=broadcastSelected.has(st.id);
      return `<label class="recipient-item ${valid?'':'phone-invalid'}"><input type="checkbox" ${checked?'checked':''} onchange="toggleBroadcastRecipient('${safe(st.id)}',this.checked)"><span><strong>${safe(st.name)}</strong><small>${safe(st.parent||'ولي الأمر')} · ${st.group?safe(st.group)+' · ':''}<b dir="ltr">${safe(st.phone||'لا يوجد رقم')}</b></small></span><em class="guardian-phone-state ${valid?'ok':'bad'}">${valid?'✓ صالح':'مراجعة'}</em></label>`;
    }).join('')||'<div class="txt-mut" style="padding:12px">لا توجد نتائج.</div>';
    refreshValidation();refreshPreviewStudents();
  }

  function toggleBroadcastRecipient(id,checked){
    GC.scope='manual';
    document.querySelectorAll('[data-guardian-scope]').forEach(b=>b.classList.remove('on'));
    if(checked)broadcastSelected.add(id);else broadcastSelected.delete(id);
    refreshValidation();refreshPreviewStudents();updateBroadcastPreview();
  }

  function refreshPreviewStudents(){
    const sel=$('guardianPreviewStudent');if(!sel)return;
    const list=selectedStudents();
    const keep=GC.previewId&&list.some(s=>s.id===GC.previewId)?GC.previewId:(list[0]?.id||'');GC.previewId=keep;
    sel.innerHTML=list.length?list.map(st=>`<option value="${safe(st.id)}" ${st.id===keep?'selected':''}>${safe(st.name)}</option>`).join(''):'<option value="">لا يوجد مستلم محدد</option>';
  }

  function updateBroadcastCount(){refreshValidation();}

  function updateBroadcastPreview(){
    refreshValidation();refreshPreviewStudents();
    const el=$('broadcastPreview');if(!el)return;
    const st=students.find(x=>x.id===($('guardianPreviewStudent')?.value||GC.previewId))||selectedStudents()[0];
    if(!st){el.innerHTML='<div class="txt-mut">حدد طالبًا لعرض معاينة الرسالة.</div>';return;}
    GC.previewId=st.id;
    const msg=guardianMessage(st);
    el.innerHTML=`<div class="preview-title"><span>معاينة: ${safe(st.name)}</span><small>${safe(st.parent||'ولي الأمر')}</small></div><div class="preview-msg">${safe(msg).replace(/\n/g,'<br>')}</div>`;
  }

  function broadcastPresetText(type){
    const academy=settings.circle||((typeof ACADEMY_NAME!=='undefined'&&ACADEMY_NAME)||'');
    const footer=[academy,(typeof ACADEMY_TAGLINE!=='undefined'?ACADEMY_TAGLINE:'')].filter(Boolean).join('\n');
    const map={
      general:`السلام عليكم ورحمة الله وبركاته 🌿\n\nولي أمر الطالب {{اسم_الطالب}}،\n\n[اكتب رسالتك هنا]\n\nجزاكم الله خيرًا.\n${footer}`,
      schedule:`السلام عليكم ورحمة الله وبركاته 🌿\n\nولي أمر الطالب {{اسم_الطالب}}،\nنحيطكم علمًا بتغيير موعد الحصة.\n\n🕐 الموعد الجديد: [اكتب اليوم والساعة]\n\nنرجو تأكيد الاطلاع، وجزاكم الله خيرًا.\n${footer}`,
      holiday:`السلام عليكم ورحمة الله وبركاته 🌿\n\nنحيطكم علمًا بأن الحصص ستكون إجازة في: [اكتب التاريخ/الفترة]\nوتُستأنف الحصص بإذن الله في: [اكتب الموعد].\n\n${footer}`,
      greeting:`السلام عليكم ورحمة الله وبركاته 🌿\n\nيتقدم ${academy||'فريق التحفيظ'} بأطيب التهاني لأسرتكم الكريمة بمناسبة [اكتب المناسبة].\nنسأل الله أن يجعل أبناءنا من أهل القرآن وخاصته.\n\n${footer}`,
      reminder:`السلام عليكم ورحمة الله وبركاته 🌿\n\nتذكير لولي أمر الطالب {{اسم_الطالب}}:\n[اكتب التذكير هنا]\n\nجزاكم الله خيرًا.\n${footer}`
    };return map[type]||map.general;
  }

  function applyBroadcastPreset(){const ta=$('broadcastText');if(ta)ta.value=broadcastPresetText($('broadcastPreset')?.value||'general');updateBroadcastPreview();}
  function insertBroadcastVar(v){const ta=$('broadcastText');if(!ta)return;const a=ta.selectionStart||0,b=ta.selectionEnd||a;ta.value=ta.value.slice(0,a)+v+ta.value.slice(b);ta.focus();ta.setSelectionRange(a+v.length,a+v.length);updateBroadcastPreview();}

  async function copyBroadcastMessage(){
    const st=students.find(x=>x.id===($('guardianPreviewStudent')?.value||GC.previewId))||selectedStudents()[0];
    if(!st){toast('حدد طالبًا أولاً','error');return;}
    const ok=await copyTextSafe(guardianMessage(st));toast(ok?'تم نسخ المعاينة':'تعذر النسخ',ok?'success':'error');
  }

  function openBroadcastComposer(options={}){
    GC.mode=options.mode||'session';GC.scope='none';GC.previewId='';broadcastSelected=new Set();broadcastQueue=[];broadcastQueueIndex=0;
    populateGroups();
    if($('broadcastPreset'))$('broadcastPreset').value='general';
    if($('broadcastText'))$('broadcastText').value=broadcastPresetText('general');
    if($('broadcastSearch'))$('broadcastSearch').value='';
    if($('broadcastProgress')){$('broadcastProgress').style.display='none';$('broadcastProgress').innerHTML='';}
    setGuardianMode(GC.mode);
    setBroadcastRecipients(options.scope||'none');
    $('broadcastModal')?.classList.add('open');
  }

  function closeBroadcastComposer(){$('broadcastModal')?.classList.remove('open');broadcastQueue=[];broadcastQueueIndex=0;}

  function startBroadcastQueue(){
    refreshValidation();
    if(!GC.valid.length){toast(GC.invalid.length?'راجع أرقام واتساب المحددة أولاً':'حدد ولي أمر واحدًا على الأقل','error');return;}
    broadcastQueue=[...GC.valid];broadcastQueueIndex=0;
    if(GC.invalid.length)toast(`سيتم تجاهل ${GC.invalid.length} رقم غير صالح`,'error');
    sendNextBroadcast();
  }

  function sendNextBroadcast(){
    const p=$('broadcastProgress');
    if(broadcastQueueIndex>=broadcastQueue.length){if(p){p.style.display='block';p.innerHTML=`<div class="guardian-done">✅ اكتملت القائمة: ${broadcastQueue.length} رسالة تم تجهيزها وفتحها. الإرسال النهائي تم/يتم من داخل WhatsApp.</div>`;}toast('اكتملت قائمة التواصل','success');return;}
    const st=broadcastQueue[broadcastQueueIndex],text=guardianMessage(st);openWhatsApp(st,text);broadcastQueueIndex++;
    if(p){const left=broadcastQueue.length-broadcastQueueIndex;p.style.display='block';p.innerHTML=`<div class="guardian-queue-head"><strong>${broadcastQueueIndex}/${broadcastQueue.length}</strong><span>${safe(st.name)}</span></div><div class="guardian-progress-track"><i style="width:${Math.round(broadcastQueueIndex/broadcastQueue.length*100)}%"></i></div><p>${left?'بعد مراجعة/إرسال الرسالة في WhatsApp ارجع واضغط «التالي».':'وصلت لنهاية القائمة.'}</p>${left?'<button class="btn btn-wa btn-sm" onclick="sendNextBroadcast()">فتح الرسالة التالية ←</button>':''}`;}
  }

  function guardianOpenInvalidStudents(){
    if(!GC.invalid.length){toast('لا توجد أرقام تحتاج مراجعة','success');return;}
    const names=GC.invalid.map(s=>s.name).join('، ');alert(`راجع رقم واتساب للطلاب:\n${names}\n\nيمكن تعديل الرقم من ملف الطالب.`);
  }

  function guardianSelectPreview(){GC.previewId=$('guardianPreviewStudent')?.value||'';updateBroadcastPreview();}
  function guardianGroupChanged(){if($('guardianGroup')?.value)setBroadcastRecipients('group');}

  Object.assign(globalThis,{openBroadcastComposer,closeBroadcastComposer,setGuardianMode,setBroadcastRecipients,renderBroadcastRecipients,toggleBroadcastRecipient,updateBroadcastCount,updateBroadcastPreview,broadcastPresetText,applyBroadcastPreset,insertBroadcastVar,copyBroadcastMessage,startBroadcastQueue,sendNextBroadcast,guardianOpenInvalidStudents,guardianSelectPreview,guardianGroupChanged});
})();
