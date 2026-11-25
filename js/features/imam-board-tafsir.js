'use strict';
/* Optional, device-local scientific corpus. Quran itself remains sourced from the existing Quran engine.
   Records are NOT authenticated merely by importing a file: provenance is explicitly disclosed in UI. */
(function (g) {
  const root=g.ImamApp||(g.ImamApp={});
  const DB='imam-board-scientific-corpus-v1', STORE='entries', META='meta', LIMIT=24*1024*1024;
  const SOURCES=Object.freeze({
    verse:{title:'التفسير الميسر — مجمع الملك فهد لطباعة المصحف الشريف',url:'https://qurancomplex.gov.sa/en/techquran/dev/'},
    word:{title:'الميسر في غريب القرآن الكريم — مجمع الملك فهد لطباعة المصحف الشريف',url:'https://qurancomplex.gov.sa/en/techquran/dev/'}
  });
  const diacritics=/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;
  const normalized=s=>String(s||'').normalize('NFC').replace(diacritics,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/[^\u0621-\u064A]/g,'');
  const asInt=n=>Number.isInteger(Number(n))?Number(n):NaN;
  function suraIndex(name){const list=typeof S!=='undefined'?S:(g.S||[]);return list.findIndex(x=>normalized(x.n)===normalized(name))+1;}
  function safeText(raw){return String(raw??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,+n))).replace(/\s+/g,' ').trim();}
  function columns(data){if(Array.isArray(data))return data;
    if(data&&typeof data==='object')for(const key of ['data','rows','records','items','verses','tafsir','tafseer','words'])if(Array.isArray(data[key]))return data[key];
    // One record is allowed for a small test/sample import.
    if(data&&typeof data==='object'&&('aya_no' in data||'ayah' in data))return [data];
    throw Error('ملف غير مدعوم: يجب اختيار JSON/CSV لبيانات المجمع');
  }
  function parseCSV(s){s=s.replace(/^\ufeff/,'');const rows=[];let cells=[],value='',quote=false;
    for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quote&&s[i+1]==='"'){value+='"';i++;}else quote=!quote;}else if(c===','&&!quote){cells.push(value);value='';}else if((c==='\n'||c==='\r')&&!quote){cells.push(value);value='';if(cells.some(x=>x.trim()))rows.push(cells);cells=[];if(c==='\r'&&s[i+1]==='\n')i++;}else value+=c;}
    if(quote)throw Error('ملف CSV يحتوي اقتباسًا غير مغلق');cells.push(value);if(cells.some(x=>x.trim()))rows.push(cells);if(rows.length<2)throw Error('CSV بلا بيانات');const heads=rows.shift().map(x=>x.replace(/^\ufeff/,'').trim());return rows.map(row=>Object.fromEntries(heads.map((h,i)=>[h,row[i]||''])));
  }
  function canonical(row,kind){if(!row||typeof row!=='object')return null;
    const chapter=asInt(row.sura_no??row.surah_no??row.surah??row.chapter??row.sura_id??suraIndex(row.sura_name??row.sura_name_ar??row.surah_name));
    const ayah=asInt(row.aya_no??row.ayah_no??row.ayah??row.verse??row.aya);
    const suras=typeof S!=='undefined'?S:(g.S||[]);const max=Number(suras?.[chapter-1]?.a);
    if(!(chapter>=1&&chapter<=114&&ayah>=1&&ayah<=286)||(!Number.isInteger(max)||ayah>max))return null;
    const content=safeText(kind==='verse'?row.aya_tafseer??row.ayah_tafseer??row.tafseer??row.tafsir??row.explanation:row.explanation??row.meaning??row.tafseer);
    if(content.length<2||content.length>7500)return null;
    const word=kind==='word'?safeText(row.quranic_words??row.word??row.quranic_word):'';
    if(kind==='word'&&(!normalized(word)||word.length>100))return null;
    return{key:(kind==='verse'?'t:':'w:')+chapter+':'+ayah+(kind==='word'?':'+normalized(word):''),chapter,ayah,kind,word,content};
  }
  function dbOpen(){if(!g.indexedDB)return Promise.reject(Error('التخزين العلمي المحلي غير مدعوم في هذا المتصفح'));
    return new Promise((resolve,reject)=>{const request=g.indexedDB.open(DB,1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'});if(!db.objectStoreNames.contains(META))db.createObjectStore(META,{keyPath:'kind'});};request.onerror=()=>reject(request.error||Error('تعذر فتح قاعدة المحتوى'));request.onsuccess=()=>resolve(request.result);});}
  async function readEntry(key){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error);};});}
  async function getVerse(ch,ayah){return readEntry('t:'+asInt(ch)+':'+asInt(ayah));}
  async function getWord(ch,ayah,word){const n=normalized(word);return n?readEntry('w:'+asInt(ch)+':'+asInt(ayah)+':'+n):null;}
  async function status(){const db=await dbOpen();return new Promise((resolve,reject)=>{const tx=db.transaction(META,'readonly'),req=tx.objectStore(META).getAll();req.onsuccess=()=>resolve(Object.fromEntries((req.result||[]).map(x=>[x.kind,x])));req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();reject(tx.error);};});}
  function convertFile(file,kind){if(!file||file.size>LIMIT)throw Error('الملف أكبر من الحد المسموح (24 ميجابايت)');if(!/\.(json|csv)$/i.test(file.name||''))throw Error('اختر ملف JSON أو CSV من حزمة المطورين');return file.text().then(s=>{const items=/\.csv$/i.test(file.name)?parseCSV(s):columns(JSON.parse(s));if(!Array.isArray(items)||items.length<1||items.length>16000)throw Error('عدد الصفوف غير متوقع');const valid=items.map(x=>canonical(x,kind)).filter(Boolean),unique=new Map(valid.map(x=>[x.key,x]));if(unique.size<1||unique.size<items.length*.95)throw Error('الملف غير مطابق لحقول النوع المحدد، لم يتم استيراده');return [...unique.values()];});}
  async function importFiles(files,kind,acknowledged){
    if(!SOURCES[kind])throw Error('نوع المادة غير معروف');
    if(!acknowledged)throw Error('يجب تأكيد أنك اخترت بيانات المجمع الرسمية');
    const list=Array.from(files||[]);if(!list.length||list.length>115)throw Error('اختر من ملف واحد إلى 115 ملفًا على الأكثر');
    const results=await Promise.all(list.map(file=>convertFile(file,kind)));
    const combined=new Map();for(const items of results)for(const x of items)combined.set(x.key,x);
    if(!combined.size||combined.size>16000)throw Error('عدد مدخلات المكتبة غير متوقع');
    const db=await dbOpen();return new Promise((resolve,reject)=>{
      const tx=db.transaction([STORE,META],'readwrite'),table=tx.objectStore(STORE),meta=tx.objectStore(META);
      for(const entry of combined.values())table.put(entry);
      const stats={kind,count:combined.size,importedAt:Date.now(),file:list.length===1?String(list[0].name||'').slice(0,140):`${list.length} ملفات`,sourceTitle:SOURCES[kind].title,sourceUrl:SOURCES[kind].url,verified:false};meta.put(stats);
      tx.oncomplete=()=>{db.close();resolve(stats);};tx.onerror=()=>{db.close();reject(tx.error||Error('فشل استيراد المحتوى'));};tx.onabort=()=>{db.close();reject(tx.error||Error('تعذر إكمال الاستيراد'));};
    });
  }
  const importFile=(file,kind,acknowledged)=>importFiles([file],kind,acknowledged);
  const QURANENC_BOOKS=Object.freeze({
    muyassar:{id:'muyassar',key:'arabic_moyassar',title:'التفسير الميسر',publisher:'مجمع الملك فهد لطباعة المصحف الشريف',version:'1.0.1',source:'https://quranenc.com/ar/browse/arabic_moyassar'},
    mukhtasar:{id:'mukhtasar',key:'arabic_mokhtasar',title:'المختصر في تفسير القرآن الكريم',publisher:'مركز تفسير للدراسات القرآنية',version:'1.0.0',source:'https://quranenc.com/ar/browse/arabic_mokhtasar'},
    saadi:{id:'saadi',key:'arabic_saadi',title:'تفسير السعدي',publisher:'موسوعة القرآن الكريم',version:'1.0.0',source:'https://quranenc.com/ar/browse/arabic_saadi'},
    seraj:{id:'seraj',key:'arabic_seraj',title:'معاني الكلمات — السراج في بيان غريب القرآن',publisher:'موسوعة القرآن الكريم',version:'1.0.0',source:'https://quranenc.com/ar/browse/arabic_seraj'}
  });
  const TAFSIR_DB='imam-quranenc-tafsir-cache-v1',TAFSIR_STORE='entries';
  let tafsirDbPromise=null,tafsirDialogState=null;
  const escHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function tafsirDb(){if(!g.indexedDB)return Promise.reject(Error('التخزين المحلي للتفسير غير مدعوم'));if(!tafsirDbPromise)tafsirDbPromise=new Promise((resolve,reject)=>{const req=g.indexedDB.open(TAFSIR_DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(TAFSIR_STORE))req.result.createObjectStore(TAFSIR_STORE,{keyPath:'key'});};req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();tafsirDbPromise=null;};resolve(db);};req.onerror=()=>reject(req.error||Error('تعذر فتح مكتبة التفسير'));}).catch(e=>{tafsirDbPromise=null;throw e;});return tafsirDbPromise;}
  async function tafsirCacheGet(key){const db=await tafsirDb();return new Promise((resolve,reject)=>{const tx=db.transaction(TAFSIR_STORE,'readonly'),req=tx.objectStore(TAFSIR_STORE).get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);tx.onerror=()=>reject(tx.error);});}
  async function tafsirCachePutMany(rows){if(!rows.length)return 0;const db=await tafsirDb();return new Promise((resolve,reject)=>{const tx=db.transaction(TAFSIR_STORE,'readwrite'),store=tx.objectStore(TAFSIR_STORE);rows.forEach(x=>store.put(x));tx.oncomplete=()=>resolve(rows.length);tx.onerror=()=>reject(tx.error||Error('تعذر حفظ التفسير'));tx.onabort=()=>reject(tx.error||Error('أُلغي حفظ التفسير'));});}
  function tafsirRowFromApi(row,book,chapter,fallbackAyah){
    const ayah=asInt(row?.aya??row?.ayah??row?.aya_no??fallbackAyah),content=String(row?.translation??row?.tafsir??row?.text??'').trim();
    if(!(ayah>=1&&ayah<=286)||!content)return null;
    return{key:`${book.id}:${chapter}:${ayah}`,book:book.id,chapter,ayah,content,footnotes:String(row?.footnotes??'').trim(),title:book.title,publisher:book.publisher,version:book.version,source:book.source,cachedAt:Date.now()};
  }
  function apiResult(data){const x=data?.result??data?.data??data;return Array.isArray(x)?x:(x&&typeof x==='object'?[x]:[]);}
  async function fetchTafsirAyah(chapter,ayah,bookId){
    const book=QURANENC_BOOKS[bookId]||QURANENC_BOOKS.muyassar,url=`https://quranenc.com/api/v1/translation/aya/${encodeURIComponent(book.key)}/${chapter}/${ayah}`;
    const response=await g.fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});if(!response.ok)throw Error(`TAFSIR_HTTP_${response.status}`);
    const data=await response.json(),row=tafsirRowFromApi(apiResult(data)[0],book,chapter,ayah);if(!row)throw Error('TAFSIR_EMPTY');await tafsirCachePutMany([row]);return row;
  }
  async function lookupAyah(chapter,ayah,bookId='muyassar'){
    const book=QURANENC_BOOKS[bookId]||QURANENC_BOOKS.muyassar;
    if(book.id==='muyassar'){try{const imported=await getVerse(chapter,ayah);if(imported?.content)return{...imported,title:book.title,publisher:book.publisher,version:book.version,source:book.source,origin:'local-import'};}catch(_){}}
    const key=`${book.id}:${chapter}:${ayah}`;try{const cached=await tafsirCacheGet(key);if(cached?.content)return{...cached,origin:'device-cache'};}catch(_){}
    if(g.navigator?.onLine===false)throw Error('TAFSIR_OFFLINE_MISS');
    return fetchTafsirAyah(chapter,ayah,book.id);
  }
  async function downloadSurahTafsir(chapter,bookId='muyassar',onProgress){
    chapter=asInt(chapter);if(!(chapter>=1&&chapter<=114))throw Error('TAFSIR_INVALID_SURAH');const book=QURANENC_BOOKS[bookId]||QURANENC_BOOKS.muyassar;
    const response=await g.fetch(`https://quranenc.com/api/v1/translation/sura/${encodeURIComponent(book.key)}/${chapter}`,{headers:{Accept:'application/json'},cache:'no-store'});if(!response.ok)throw Error(`TAFSIR_HTTP_${response.status}`);
    const data=await response.json(),rows=apiResult(data).map((row,i)=>tafsirRowFromApi(row,book,chapter,row?.aya??row?.ayah??i+1)).filter(Boolean);
    if(!rows.length)throw Error('TAFSIR_EMPTY_SURAH');await tafsirCachePutMany(rows);onProgress?.({done:rows.length,total:rows.length});return rows.length;
  }
  function ensureTafsirDialog(){
    let el=g.document.getElementById('imamTafsirDialog');if(el)return el;
    el=g.document.createElement('div');el.id='imamTafsirDialog';el.className='imam-tafsir-dialog';el.hidden=true;
    el.innerHTML=`<div class="imam-tafsir-backdrop" data-tafsir-close="1"></div><section class="imam-tafsir-card" role="dialog" aria-modal="true" aria-labelledby="imamTafsirTitle"><header><div><small id="imamTafsirMeta">تفسير الآية</small><b id="imamTafsirTitle">التفسير الميسر</b></div><button type="button" data-tafsir-close="1" aria-label="إغلاق">✕</button></header><div class="imam-tafsir-verse" id="imamTafsirVerse"></div><div class="imam-tafsir-controls"><label><span>مصدر التفسير</span><select id="imamTafsirBook"><option value="muyassar">التفسير الميسر — مجمع الملك فهد</option><option value="mukhtasar">المختصر في تفسير القرآن — مركز تفسير</option><option value="saadi">تفسير السعدي</option><option value="seraj">معاني الكلمات — السراج في غريب القرآن</option></select></label><button type="button" id="imamTafsirDownload">↓ تنزيل تفسير السورة</button></div><div class="imam-tafsir-body" id="imamTafsirBody" aria-live="polite">جارٍ تحميل التفسير…</div><div class="imam-tafsir-source" id="imamTafsirSource"></div><footer><span id="imamTafsirStatus" role="status"></span><button type="button" data-tafsir-close="1">إغلاق</button></footer></section>`;
    g.document.body.appendChild(el);el.addEventListener('click',e=>{if(e.target?.dataset?.tafsirClose)closeAyah();});
    el.querySelector('#imamTafsirBook').addEventListener('change',()=>void loadDialogTafsir());
    el.querySelector('#imamTafsirDownload').addEventListener('click',()=>void downloadDialogSurah());return el;
  }
  function closeAyah(){const el=g.document.getElementById('imamTafsirDialog');if(el)el.hidden=true;tafsirDialogState=null;}
  async function loadDialogTafsir(){
    const el=ensureTafsirDialog(),ctx=tafsirDialogState;if(!ctx)return;
    const bookId=el.querySelector('#imamTafsirBook').value,body=el.querySelector('#imamTafsirBody'),source=el.querySelector('#imamTafsirSource'),status=el.querySelector('#imamTafsirStatus');
    body.textContent=ctx.mode==='word'?'جارٍ البحث عن معنى الكلمة…':'جارٍ تحميل التفسير…';source.textContent='';status.textContent='';
    try{
      let row=null,exactWord=false;
      if(ctx.mode==='word'&&bookId==='seraj'){
        try{row=await getWord(ctx.chapter,ctx.ayah,ctx.word);exactWord=!!row?.content;}catch(_){}
      }
      if(!row?.content)row=await lookupAyah(ctx.chapter,ctx.ayah,bookId);
      body.textContent=row.content;
      if(ctx.mode==='word'){
        const sourceTitle=row.title||SOURCES.word.title,sourceUrl=row.source||SOURCES.word.url;
        source.textContent=`${exactWord?'معنى الكلمة من المدخل المطابق':'معاني كلمات الآية'} · المصدر: ${sourceTitle} · ${row.publisher||'مكتبة التفسير المحلية'} · ${sourceUrl}`;
        status.textContent=exactWord?'تم العثور على معنى الكلمة وحفظه محليًا.':row.origin==='device-cache'?'معاني الآية متاحة دون إنترنت على هذا الجهاز.':'لم يوجد مدخل مستقل للكلمة؛ عُرضت معاني كلمات الآية من المصدر المختار.';
      }else{
        source.textContent=`المصدر: ${row.title} · ${row.publisher} · الإصدار ${row.version} · QuranEnc.com`;
        status.textContent=row.origin==='device-cache'||row.origin==='local-import'?'متاح دون إنترنت على هذا الجهاز':'تم الحفظ محليًا بعد التحميل';
      }
    }catch(err){
      body.textContent=err?.message==='TAFSIR_OFFLINE_MISS'?'هذه المادة غير محفوظة على الجهاز بعد. اتصل بالإنترنت مرة واحدة أو نزّل تفسير السورة مسبقًا.':'تعذر جلب المادة الآن. حاول مرة أخرى عند توفر الاتصال.';
      source.textContent='المحتوى لا يُعرض من الذاكرة إلا بعد تنزيله وحفظه محليًا.';status.textContent='';
    }
  }
  async function downloadDialogSurah(){const el=ensureTafsirDialog(),ctx=tafsirDialogState;if(!ctx)return;const bookId=el.querySelector('#imamTafsirBook').value,btn=el.querySelector('#imamTafsirDownload'),status=el.querySelector('#imamTafsirStatus');btn.disabled=true;status.textContent='جارٍ تنزيل تفسير السورة وحفظه للعمل دون إنترنت…';try{const count=await downloadSurahTafsir(ctx.chapter,bookId);status.textContent=`تم حفظ ${count} آية من تفسير السورة على هذا الجهاز.`;await loadDialogTafsir();}catch(err){status.textContent='تعذر تنزيل تفسير السورة. أعد المحاولة عند استقرار الاتصال.';}finally{btn.disabled=false;}}
  async function openAyah(input){const chapter=asInt(input?.chapter),ayah=asInt(input?.ayah);if(!(chapter>=1&&chapter<=114&&ayah>=1&&ayah<=286))throw Error('TAFSIR_INVALID_AYAH');const el=ensureTafsirDialog();tafsirDialogState={mode:'ayah',chapter,ayah,surah:String(input?.surah||''),verseText:String(input?.verseText||'').slice(0,1600)};el.querySelector('#imamTafsirMeta').textContent=`سورة ${tafsirDialogState.surah||chapter} · الآية ${ayah}`;el.querySelector('#imamTafsirTitle').textContent='تفسير الآية';el.querySelector('#imamTafsirVerse').textContent=tafsirDialogState.verseText;el.querySelector('#imamTafsirBook').value='muyassar';el.hidden=false;await loadDialogTafsir();}
  async function openWord(input){
    const chapter=asInt(input?.chapter),ayah=asInt(input?.ayah),word=String(input?.word||'').trim().slice(0,120);
    if(!(chapter>=1&&chapter<=114&&ayah>=1&&ayah<=286&&word))throw Error('TAFSIR_INVALID_WORD');
    const el=ensureTafsirDialog();tafsirDialogState={mode:'word',chapter,ayah,surah:String(input?.surah||''),word,verseText:String(input?.verseText||'').slice(0,1600)};
    el.querySelector('#imamTafsirMeta').textContent=`معنى «${word}» · سورة ${tafsirDialogState.surah||chapter} · الآية ${ayah}`;
    el.querySelector('#imamTafsirTitle').textContent='معنى الكلمة / معاني كلمات الآية';
    el.querySelector('#imamTafsirVerse').textContent=tafsirDialogState.verseText;
    el.querySelector('#imamTafsirBook').value='seraj';el.hidden=false;await loadDialogTafsir();
  }
  root.BoardTafsir=Object.freeze({SOURCES,QURANENC_BOOKS,normalized,safeText,canonical,parseCSV,getVerse,getWord,status,importFile,importFiles,lookupAyah,downloadSurahTafsir,openAyah,openWord,closeAyah});
})(window);
