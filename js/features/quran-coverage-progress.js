'use strict';
/* Imam Academy beta.27 — cumulative Quran evidence viewer.
 * Derived only from existing student sessions and teacher-verified ranges.
 * Read-only. No alternate ledger, no server calls, no AI-generated Quran text. */
(function initQuranCoverage(g){
  const root=g.ImamApp||(g.ImamApp={});
  const esc=v=>root.Utils?.escapeHtml?.(v??'')??String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const key=v=>String(v??'').trim().replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي');
  const recordedGrade=x=>['ممتاز','جيد جداً','جيد جدًا','جيد','ضعيف','يحتاج متابعة','إعادة'].includes(String(x||'').trim());
  const validScore=x=>x!==''&&x!==null&&x!==undefined&&Number.isFinite(Number(x))&&Number(x)>=0&&Number(x)<=100;
  function metadata(surahs){
    if(!Array.isArray(surahs)||surahs.length!==114)return null;
    const offsets=[0],names=new Map(),rows=[];
    for(let i=0;i<surahs.length;i++){
      const name=String(surahs[i]?.n||'').trim(),length=Number(surahs[i]?.a);
      if(!name||!Number.isInteger(length)||length<=0)return null;
      const normalized=key(name);
      if(names.has(normalized))return null;
      names.set(normalized,i);
      rows.push({id:i+1,name,length});offsets.push(offsets[i]+length);
    }
    if(offsets[114]!==6236)return null;
    return{offsets,names,rows,total:offsets[114]};
  }
  function resolveRange(raw,meta){
    if(!raw||typeof raw!=='object')return null;
    const num=Number(raw.surahId);
    const found=meta.names.get(key(raw.surah||raw.surahName));
    // Never map an ambiguous name to a different chapter silently.
    if(found===undefined&&String(raw.surah||raw.surahName||'').trim())return null;
    if(found===undefined&&!(Number.isInteger(num)&&num>=1&&num<=114))return null;
    if(found!==undefined&&Number.isInteger(num)&&num>0&&num!==found+1)return null;
    const idx=found!==undefined?found:num-1;
    const full=raw.full===true;
    const from=full?1:Number(raw.from),to=full?meta.rows[idx].length:Number(raw.to);
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<1||from>to||to>meta.rows[idx].length)return null;
    return{idx,from,to,start:meta.offsets[idx]+from-1,end:meta.offsets[idx]+to-1};
  }
  function mark(bits,range){for(let i=range.start;i<=range.end;i++)bits[i]=1;}
  function count(bits,start,end){let n=0;for(let i=start;i<end;i++)n+=bits[i]||0;return n;}
  function rubOffsets(meta,quranStructure){
    const refs=quranStructure?.RUB_STARTS;
    if(!Array.isArray(refs)||refs.length!==240)return null;
    const offsets=[];
    for(const raw of refs){
      const match=/^(\d{1,3}):(\d{1,3})$/.exec(String(raw||''));if(!match)return null;
      const sid=Number(match[1]),aya=Number(match[2]);
      if(sid<1||sid>114||aya<1||aya>meta.rows[sid-1].length)return null;
      offsets.push(meta.offsets[sid-1]+aya-1);
    }
    if(offsets[0]!==0||offsets.some((n,i)=>i>0&&n<=offsets[i-1]))return null;
    return[...offsets,meta.total];
  }
  function build(studentId,allSessions,surahs,verifiedSections,quranStructure){
    const meta=metadata(surahs);
    if(!meta)return{available:false,reason:'بيانات السور المرجعية غير متاحة أو غير مكتملة.'};
    if(!Array.isArray(verifiedSections))return{available:false,reason:'تعذر قراءة نتائج الحفظ المجتازة من السجل الأصلي.'};
    const pass=new Uint8Array(meta.total),reviewed=new Uint8Array(meta.total);
    const rows=Array.isArray(allSessions)?allSessions:[];
    for(const sec of verifiedSections){const r=resolveRange(sec,meta);if(r)mark(pass,r);}
    let reviewedAssessments=0;
    for(const ses of rows){
      if(String(ses?.studentId)!==String(studentId)||ses?.status!=='حضر')continue;
      for(const section of ['rec','far']){
        const raw=ses?.actualRecitation?.[section];
        const grade=ses?.prevGrades?.[section],score=ses?.assessmentScores?.[section];
        // A grade without a recorded actual range is not evidence of verse coverage.
        if(!recordedGrade(grade)&&!validScore(score))continue;
        const r=resolveRange(raw,meta);if(!r)continue;
        mark(reviewed,r);reviewedAssessments++;
      }
    }
    const surahRows=meta.rows.map((r,i)=>{
      const verified=count(pass,meta.offsets[i],meta.offsets[i+1]);
      const review=count(reviewed,meta.offsets[i],meta.offsets[i+1]);
      return{...r,verified,review,pct:Math.round(verified/r.length*100)};
    }).filter(r=>r.verified||r.review);
    const rubs=rubOffsets(meta,quranStructure);
    const juzRows=[];
    if(rubs){
      for(let juz=1;juz<=30;juz++){
        const first=(juz-1)*8,quarters=[];
        for(let q=0;q<8;q++){
          const index=first+q,total=rubs[index+1]-rubs[index];
          quarters.push({index:index+1,quarter:q+1,hizb:(juz-1)*2+Math.floor(q/4)+1,
            total,verified:count(pass,rubs[index],rubs[index+1]),review:count(reviewed,rubs[index],rubs[index+1])});
        }
        const total=quarters.reduce((a,r)=>a+r.total,0),verified=quarters.reduce((a,r)=>a+r.verified,0),review=quarters.reduce((a,r)=>a+r.review,0);
        if(verified||review)juzRows.push({juz,total,verified,review,pct:Math.round(verified/total*100),quarters});
      }
    }
    const verified=count(pass,0,meta.total),review=count(reviewed,0,meta.total);
    return{available:true,studentId,verified,review,total:meta.total,verifiedPct:Math.round(verified/meta.total*1000)/10,
      surahRows,juzRows,quartersAvailable:!!rubs,reviewedAssessments,source:'السجلات التعليمية المحلية المتاحة'};
  }
  function render(studentId,allSessions,surahs,verifiedSections,quranStructure){
    const data=build(studentId,allSessions,surahs,verifiedSections,quranStructure);
    if(!data.available)return`<section class="qcp-panel"><h3>📚 الخريطة القرآنية التراكمية</h3><p>${esc(data.reason)}</p></section>`;
    const sr=data.surahRows.map(r=>`<tr><th scope="row">${esc(r.name)}</th><td>${r.verified} / ${r.length}</td><td>${r.review}</td><td>${r.pct}%</td></tr>`).join('');
    const jr=data.juzRows.map(r=>{
      const qs=r.quarters.filter(q=>q.verified||q.review).map(q=>`<tr><td>الحزب ${q.hizb} · الربع ${q.quarter<=4?q.quarter:q.quarter-4}</td><td>${q.verified} / ${q.total}</td><td>${q.review}</td></tr>`).join('');
      return`<details class="qcp-juz"><summary><b>الجزء ${r.juz}</b><span>${r.verified} / ${r.total} حفظ مجتاز · ${r.review} مراجعة</span></summary><div class="qcp-scroll"><table><thead><tr><th>الموضع</th><th>الحفظ المجتاز</th><th>المراجعة</th></tr></thead><tbody>${qs}</tbody></table></div></details>`;
    }).join('');
    return`<section class="qcp-panel" aria-label="الخريطة القرآنية التراكمية">
      <div class="qcp-heading"><h3>📚 الخريطة القرآنية التراكمية</h3><small>كل تاريخ الطالب المتاح، وليس الفترة المختارة أعلاه</small></div>
      <div class="qcp-kpis"><div><small>آيات حفظ اجتازت تقييمًا</small><b>${data.verified}</b><span>${data.verifiedPct}% من مجموع آيات القرآن</span></div>
      <div><small>آيات خضعت لمراجعة فعلية مسجلة</small><b>${data.review}</b><span>لا تُحتسب حفظًا جديدًا</span></div>
      <div><small>سور لها نشاط موثق</small><b>${data.surahRows.length}</b><span>من ١١٤ سورة</span></div></div>
      <details class="qcp-details"><summary>عرض تقدم السور (${data.surahRows.length})</summary>${sr?`<div class="qcp-scroll"><table><thead><tr><th>السورة</th><th>الحفظ المجتاز</th><th>المراجعة</th><th>نسبة الحفظ</th></tr></thead><tbody>${sr}</tbody></table></div>`:'<p>لا توجد مواضع مقيمة يمكن حسابها بعد.</p>'}</details>
      <details class="qcp-details"><summary>عرض الأجزاء والأحزاب والأرباع</summary>${data.quartersAvailable?(jr||'<p>لا توجد مواضع مقيمة موزعة على الأجزاء بعد.</p>'):'<p>تعذر التحقق من حدود الأرباع المرجعية؛ لم تُعرض تقسيمات تقديرية.</p>'}</details>
      <p class="qcp-note">المواضع المجتازة مأخوذة من آلية الحفظ المقيَّم الموجودة في التطبيق؛ المراجعة تُحسب فقط عندما يكون نطاق التسميع الفعلي والتقييم مسجلين. لا يعني اجتياز موضع أنه مُتقن للأبد؛ تُراجع الأخطاء والتقييمات الحالية في لوحة التقدم أعلاه. لا تُحتسب الحصص الغائبة أو التكليفات غير المُسمَّعة.</p>
    </section>`;
  }
  root.QuranCoverageProgress=Object.freeze({build,render});
  if(typeof module!=='undefined'&&module.exports)module.exports={build,render};
})(typeof globalThis!=='undefined'?globalThis:this);
