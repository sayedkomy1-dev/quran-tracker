"use strict";
/* Guest-only Quran player, local-first bookmarks and OPTIONAL Google cloud backup. */
(function(g){
 const $=id=>g.document.getElementById(id), KEY='wlq.guest.practice.v1';
 const SB_URL='https://svtcntalwfmexthcnvqe.supabase.co';
 const SB_KEY='sb_publishable_qYw8VdT1IXQ5WsdB2rhtEA_F6dSAN-j';
 const MAX_BOOKMARKS=120;
 let client=null,user=null,remoteTimer=null,inFlight=false,localOK=true;
 const def=()=>({id:g.crypto?.randomUUID?.()||'guest-'+Date.now().toString(36),nickname:'',last:null,bookmarks:[],updatedAt:0});
 function safe(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 function read(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(!x||typeof x!=='object'||!x.id)return def();return {...def(),...x,bookmarks:Array.isArray(x.bookmarks)?x.bookmarks.slice(0,MAX_BOOKMARKS):[]};}catch(_){return def();}}
 let state=read(),bookmarkSignature=null;
 function bindPlayerContext(){g.ImamGuardianTahfeez?.setContext?.({academy:{name:'التحفيظ الحر'},student:{name:'ضيف-'+state.id,group:'',guardian:''},learning:{}});}
 function localSave(){state.updatedAt=Date.now();try{localStorage.setItem(KEY,JSON.stringify(state));localOK=true;}catch(_){localOK=false;}draw();if(user)scheduleCloud();}
 function nameFor(s){const option=$('tahfeezSurah')?.querySelector(`option[value="${Number(s)}"]`);return option?.textContent?.replace(/^\d+\.\s*/, '')||`سورة رقم ${Number(s)}`;}
 function draw(){
   $('guestSaveMode').textContent=!localOK?'تعذر الحفظ المحلي — لا تغلق الصفحة':user?'المزامنة بجوجل عند الاتصال':'محفوظ على هذا الجهاز';
   const l=state.last;
   $('guestLast').textContent=l?`آخر موضع: ${nameFor(l.chapter)} — الآية ${l.ayah} · ${new Date(l.updatedAt||state.updatedAt).toLocaleDateString('ar-EG')}`:'لم تبدأ أي جلسة بعد.';
   $('guestContinue').disabled=!l;
   const root=$('guestBookmarks'),signature=JSON.stringify(state.bookmarks);if(signature===bookmarkSignature)return;bookmarkSignature=signature;root.replaceChildren();
   if(!state.bookmarks.length){const p=g.document.createElement('p');p.textContent='مفيش علامات لسه. افتح التحفيظ واضغط «ضع علامة» عند الآية.';root.append(p);return;}
   state.bookmarks.forEach((x,i)=>{
     const row=g.document.createElement('div');row.className='guest-bookmark';
     const open=g.document.createElement('button');open.textContent=`${nameFor(x.chapter)} — الآية ${x.ayah}`;open.onclick=()=>openBookmark(x);
     const rem=g.document.createElement('button');rem.className='guest-remove';rem.setAttribute('aria-label','حذف العلامة');rem.textContent='حذف';rem.onclick=()=>{state.bookmarks.splice(i,1);localSave();};
     row.append(open,rem);root.append(row);
   });
 }
 function openBookmark(x){const ch=Number(x.chapter);const opt=$('tahfeezSurah')?.querySelector(`option[value="${ch}"]`),surah=opt?.textContent?.replace(/^\d+\.\s*سورة\s*/, '');
    if(!surah)return;const last=state.last?.chapter===ch?state.last:null;
    const from=Math.max(1,Math.min(x.ayah,Number(x.from)||Number(last?.from)||x.ayah));
    const max=g.ImamGuardianTahfeez?.ayahCount?.(ch)||286;
    const to=Math.max(x.ayah,Number(x.to)||Number(last?.to)||max);
    g.ImamGuardianTahfeez?.openCorrectionRange?.({surah,from,to,startAyah:x.ayah,practiceMode:'listen'});}
 function addBookmark(){const chapter=Number($('tahfeezSurah')?.value||1),ayah=Number($('tahfeezNowAyah')?.textContent?.match(/\d+/)?.[0]||1);if(!Number.isInteger(chapter)||chapter<1||chapter>114||!Number.isInteger(ayah)||ayah<1)return;
   if(!state.bookmarks.some(x=>x.chapter===chapter&&x.ayah===ayah)){state.bookmarks.unshift({chapter,ayah,from:Number($('tahfeezFrom')?.value)||ayah,to:Number($('tahfeezTo')?.value)||ayah,at:Date.now()});state.bookmarks=state.bookmarks.slice(0,MAX_BOOKMARKS);localSave();}
   const alert=g.document.getElementById('guestBookmarkToast')||g.document.createElement('div');alert.id='guestBookmarkToast';alert.className='tahfeez-toast show';alert.textContent=localOK?'🔖 تم حفظ العلامة في سجلك':'تعذر حفظ العلامة محليًا؛ تحقق من المساحة';g.document.body.append(alert);g.setTimeout(()=>alert.classList.remove('show'),1800);
 }
 function cloudStatus(s){$('guestCloudStatus').textContent=s;}
 function merge(remote){if(!remote||typeof remote!=='object')return;
   const remoteTime=Number(remote.updatedAt||0),localTime=Number(state.updatedAt||0);
   const localBookmarks=Array.isArray(state.bookmarks)?state.bookmarks:[],other=Array.isArray(remote.bookmarks)?remote.bookmarks:[];
   const unique=new Map();for(const x of [...localBookmarks,...other]){if(!x||!Number.isInteger(Number(x.chapter))||!Number.isInteger(Number(x.ayah)))continue;const key=`${x.chapter}:${x.ayah}`;if(!unique.has(key)||Number(x.at||0)>Number(unique.get(key).at||0))unique.set(key,x);}
   const last=remoteTime>localTime?remote.last||state.last:state.last||remote.last;
   state={...state,nickname:state.nickname||String(remote.nickname||'').slice(0,50),last,bookmarks:[...unique.values()].sort((a,b)=>Number(b.at||0)-Number(a.at||0)).slice(0,MAX_BOOKMARKS),updatedAt:Math.max(localTime,remoteTime)};
   try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}
   bindPlayerContext();g.ImamGuardianTahfeez?.restoreGuestLast?.(state.last);
   draw();$('guestNickname').value=state.nickname||'';
 }
 async function library(){if(g.supabase?.createClient)return true;if(g.navigator.onLine===false)return false;
   return new Promise(resolve=>{const el=g.document.createElement('script');el.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';el.onload=()=>resolve(!!g.supabase?.createClient);el.onerror=()=>resolve(false);g.document.head.append(el);});}
 async function api(){if(client)return client;if(!(await library()))return null;client=g.supabase.createClient(SB_URL,SB_KEY,{auth:{storageKey:'wlq-guest-google-v1',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});return client;}
 async function cloudRead(){const sb=await api();if(!sb||!user)return;
   const {data,error}=await sb.from('quran_guest_practice').select('payload,updated_at').eq('user_id',user.id).maybeSingle();
   if(error)throw error;
   if(data?.payload)merge({...data.payload,updatedAt:Number(data.payload.updatedAt)||Date.parse(data.updated_at)||0});
 }
 function scheduleCloud(){if(!user)return;clearTimeout(remoteTimer);remoteTimer=g.setTimeout(()=>void cloudWrite(),1200);}
 async function cloudWrite(){if(!user||inFlight||g.navigator.onLine===false)return;
   inFlight=true;const account=user.id,stamp=state.updatedAt;try{const sb=await api();if(!sb||user?.id!==account)throw new Error('OFFLINE_OR_ACCOUNT_CHANGED');
     const payload={last:state.last,bookmarks:state.bookmarks,nickname:state.nickname,updatedAt:stamp};
     const {error}=await sb.from('quran_guest_practice').upsert({user_id:account,display_name:state.nickname||'ضيف',payload,last_seen_at:new Date().toISOString()},{onConflict:'user_id'});
     if(error)throw error;if(user?.id!==account)return;cloudStatus(`✅ تم حفظ السجل بجوجل · ${user.email}`);if(state.updatedAt!==stamp)scheduleCloud();
   }catch(e){if(user?.id===account)cloudStatus((localOK?'سجلك محفوظ محليًا؛ ':'تعذر الحفظ المحلي؛ ')+ 'المزامنة السحابية لم تتأكد بعد. اضغط تحديث المحاولة بعد الاتصال.');console.warn('[guest cloud]',e?.message||e);}
   finally{inFlight=false;}
 }
 async function resumeAccount(){const sb=await api();if(!sb)return;const {data,error}=await sb.auth.getUser();if(error||!data?.user)return;
   const previous=localStorage.getItem('wlq.guest.last-google-id');
   if(previous&&previous!==data.user.id){state=def();try{localStorage.setItem(KEY,JSON.stringify(state));}catch(_){}}
   localStorage.setItem('wlq.guest.last-google-id',data.user.id);
   bindPlayerContext();
   user=data.user;$('guestGoogle').textContent='↻ مزامنة حساب جوجل';$('guestGoogleOut').hidden=false;
   try{await cloudRead();cloudStatus(`تم الدخول باستخدام ${user.email}. سجلك سيُزامَن عند توفر الإنترنت.`);scheduleCloud();}
   catch(e){cloudStatus('تم الدخول، لكن قراءة سجل جوجل تعذرت. تأكد من تشغيل تحديث SQL للإصدار الحالي.');}
   draw();
 }
 async function google(){if(user){await cloudWrite();return;}
   cloudStatus('جارٍ بدء تسجيل الدخول الاختياري...');const sb=await api();if(!sb){cloudStatus('يتطلب ربط جوجل الإنترنت؛ التدريب دون حساب ما زال متاحًا.');return;}
   const entryFile=location.pathname.endsWith('/maqraa.html')?'maqraa.html':'guest-practice.html';const redirectTo=new URL(entryFile,location.href).href;
   const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo,queryParams:{prompt:'select_account'}}});
   if(error)cloudStatus(`تعذر بدء الدخول: ${error.message}`);
 }
 async function googleOut(){if(!client||!user)return;clearTimeout(remoteTimer);const result=await client.auth.signOut();if(result?.error){cloudStatus('تعذر فصل الحساب. أعد المحاولة.');return;}user=null;$('guestGoogle').textContent='المتابعة بحساب Google';$('guestGoogleOut').hidden=true;cloudStatus('تم فصل حساب جوجل؛ سجلك المحلي على هذا الجهاز لم يُحذف.');draw();}
 function init(){
   // Reuse existing public Quran player; never call guardian session, messages or teacher auth.
   bindPlayerContext();
   $('guestNickname').value=state.nickname||'';
   g.ImamGuardianTahfeez?.restoreGuestLast?.(state.last);
   $('guestNickname').addEventListener('change',e=>{state.nickname=String(e.target.value||'').trim().slice(0,50);localSave();});
   $('guestStart').addEventListener('click',()=>g.openGuardianTahfeez?.());
   $('guestContinue').addEventListener('click',()=>{g.ImamGuardianTahfeez?.restoreGuestLast?.(state.last);g.openGuardianTahfeez?.({deferText:true});g.tahfeezResumeLast?.();});
   $('guestGoogle').addEventListener('click',google);$('guestGoogleOut').addEventListener('click',googleOut);
   g.addEventListener('wlq:guest-position',e=>{const x=e.detail||{};if(!x.chapter||!x.ayah)return;if(state.last&&['chapter','from','to','ayah','practiceMode'].every(k=>state.last[k]===x[k]))return;state.last={...x};localSave();});
   g.addEventListener('online',()=>{if(user)scheduleCloud();});draw();
   let returning=false;try{returning=Boolean(localStorage.getItem('wlq-guest-google-v1'))||/(?:access_token|refresh_token)=/.test(g.location?.hash||'');}catch(_){}
   if(g.navigator.onLine!==false&&returning)void resumeAccount();
 }
 g.GuestTahfeez={addBookmark,read:()=>structuredClone(state)};
 if(g.document.readyState==='loading')g.document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(globalThis);
