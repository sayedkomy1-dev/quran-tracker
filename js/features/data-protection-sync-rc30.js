'use strict';
/* RC30 — local-first, guarded cloud sync and encrypted daily recovery. */
(function dataProtection(g){
  const $=id=>g.document?.getElementById(id);
  let started=false,inFlight=false,retryTimer=null,pollTimer=null;
  let retryMs=15000;
  const MAX_RETRY=5*60*1000;

  // Enable automatic sync once for existing installs during this migration.
  // Teachers can still turn it off later in Settings.
  if(typeof g.migrateV8Data==='function'){
    const baseMigrate=g.migrateV8Data;
    g.migrateV8Data=function(){
      const oldVersion=Number(settings?.sync?.safeSyncVersion)||0;
      const oldRevision=Number(settings?.sync?.serverRevision)||0;
      const oldAuto=settings?.sync?.auto;
      // The legacy migrator only understands protocol marker 2. Present 2 while it runs,
      // then restore RC30 marker 3 so later saves do not reset the revision repeatedly.
      if(oldVersion>=3)settings.sync.safeSyncVersion=2;
      const changed=baseMigrate();
      settings.sync.safeSyncVersion=3;
      settings.sync.auto=oldVersion<3?true:oldAuto!==false;
      settings.sync.serverRevision=Math.max(Number(settings.sync.serverRevision)||0,oldRevision);
      return changed||oldVersion<3;
    };
  }

  function countsOf(x){
    return {students:Array.isArray(x?.students)?x.students.length:0,
      sessions:Array.isArray(x?.sessions)?x.sessions.length:0,
      tasks:Array.isArray(x?.tasks)?x.tasks.length:0};
  }
  function isReduced(next,prior){
    if(!prior)return false;
    return ['students','sessions','tasks'].some(k=>Number(prior[k]||0)>Number(next[k]||0));
  }
  function setCloudBackupStatus(text,isError=false){
    const el=$('cloudBackupStatus');if(!el)return;
    el.textContent=text;el.classList.toggle('sync-err',!!isError);
  }
  async function fingerprint(){
    const cfg={...settings};
    delete cfg.sync;delete cfg.security;delete cfg.accountOwner;
    const data=JSON.stringify({students,sessions,tasks,settings:cfg,tombstones:settings.syncTombstones||null});
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(data));
    return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  }
  function persistBase(){
    try{g.__IMAM_BASE__?.save?.();}catch(e){console.warn('[RC30] local checkpoint failed',e);}
  }
  async function dailyCloudBackup(){
    const result=await callAccountSyncRpc('account_sync_backup_daily',{});
    if(result?.created){
      settings.sync.lastBackupAt=result.created_at||new Date().toISOString();
      setCloudBackupStatus('✓ تم إنشاء نسخة سحابية يومية مشفرة.');
      persistBase();
    }else if(result?.last_backup_at){
      settings.sync.lastBackupAt=result.last_backup_at;
      setCloudBackupStatus('النسخة السحابية اليومية محفوظة · '+new Date(result.last_backup_at).toLocaleString('ar-EG'));
    }else if(result?.reason==='NO_CLOUD_SNAPSHOT'){
      setCloudBackupStatus('ستُنشأ أول نسخة سحابية بعد أول مزامنة ناجحة.');
    }
    return result;
  }

  async function pullRemoteIntoLocal(){
    const rows=await callAccountSyncRpc('account_sync_pull_v3',{});
    const row=Array.isArray(rows)?rows[0]:rows;
    if(!row?.payload){
      const known=Number(settings.sync?.lastCloudCounts?.students)||0;
      if(known>0)throw new Error('CLOUD_SNAPSHOT_MISSING_BLOCKED');
      settings.sync.serverRevision=0;
      return {found:false,revision:0};
    }
    const remote=await decryptSyncPayload(row.payload,settings.sync.passphrase);
    const access=g.WeLiveQuranAuth?.getAccess?.();
    if(remote.ownerUserId&&remote.ownerUserId!==access?.user_id)throw new Error('ACCOUNT_MISMATCH');
    const actual=countsOf(remote);
    for(const key of ['students','sessions','tasks']){
      const serverCount=row[key.slice(0,-1)+'_count'];
      if(serverCount!==null&&serverCount!==undefined&&Number(serverCount)!==actual[key]){
        throw new Error('CLOUD_SNAPSHOT_COUNT_MISMATCH');
      }
    }
    mergeCloudPayload(remote,row.revision);
    settings.sync.lastCloudCounts=actual;
    persistBase();
    return {found:true,revision:Number(row.revision)||0,counts:actual};
  }

  async function pushCloudSync(opts={}){
    if(inFlight||V8.syncing)return false;
    if(g.navigator?.onLine===false){
      renderSyncStatus?.('تم حفظ التغييرات محليًا؛ ستتم المزامنة تلقائيًا عند عودة الإنترنت.');
      return false;
    }
    if(!syncConfigValid()){
      renderSyncStatus?.('الحفظ المحلي يعمل. أدخل كلمة تشفير الحساب مرة واحدة لتفعيل المزامنة والنسخ السحابية التلقائية.',true);
      return false;
    }
    inFlight=true;V8.syncing=true;
    renderSyncStatus?.('جارٍ تنزيل أحدث نسخة ودمجها قبل أي رفع…');
    let allowDestructive=opts.allowDestructive===true;
    try{
      for(let attempt=0;attempt<3;attempt++){
        const remote=await pullRemoteIntoLocal();
        const counts=countsOf({students,sessions,tasks});
        const previous=settings.sync.lastCloudCounts||null;
        if(!remote.found&&previous&&Number(previous.students||0)>0)throw new Error('CLOUD_SNAPSHOT_MISSING_BLOCKED');
        if(remote.found&&isReduced(counts,previous)&&!allowDestructive){
          if(opts.silent||!g.confirm?.('لاحظ التطبيق أن عدد الطلاب أو الحصص أو المهام أقل من آخر نسخة سحابية.\n\nقد يكون هذا حذفًا مقصودًا، أو تحميلًا محليًا ناقصًا. لن نرفع هذا التغيير تلقائيًا.\n\nهل تؤكد اعتماد النقص ومزامنته على السحابة؟')){
            renderSyncStatus?.('⛔ أُوقفت المزامنة لحماية بيانات أقدم. راجع البيانات، ثم استخدم الرفع اليدوي وأكد الحذف إذا كان مقصودًا.',true);
            return false;
          }
          allowDestructive=true;
        }
        const currentFingerprint=await fingerprint();
        if(remote.found&&currentFingerprint===settings.sync.lastCloudFingerprint){
          await dailyCloudBackup();
          settings.sync.lastCloudCounts=counts;
          persistBase();
          renderSyncStatus?.('✓ البيانات متزامنة بالفعل؛ لا توجد تغييرات جديدة.');
          return true;
        }
        const encrypted=await encryptSyncPayload(cloudPayload(),settings.sync.passphrase);
        const expected=Number(settings.sync.serverRevision)||0;
        try{
          const result=await callAccountSyncRpc('account_sync_push_v3',{
            p_payload:encrypted,p_expected_revision:expected,
            p_student_count:counts.students,p_session_count:counts.sessions,p_task_count:counts.tasks,
            p_source_device_id:String(settings.sync.deviceId||''),
            p_allow_destructive:allowDestructive
          });
          if(result?.ok!==true)throw new Error('SYNC_NOT_CONFIRMED');
          settings.sync.serverRevision=Number(result.revision)||expected+1;
          settings.sync.lastPush=new Date().toISOString();
          settings.sync.lastCloudCounts=counts;
          settings.sync.lastCloudFingerprint=currentFingerprint;
          settings.sync.auto=true;
          persistBase();
          await dailyCloudBackup().catch(err=>{console.warn('[RC30] daily backup deferred',err);setCloudBackupStatus('تعذر إنشاء النسخة اليومية الآن؛ ستُعاد المحاولة تلقائيًا.',true);});
          renderHome?.();if(curPage==='students')renderSt?.();renderV8Settings?.();
          renderSyncStatus?.('✓ تمت المزامنة الآمنة ورفع التغييرات بنجاح.');
          if(!opts.silent)v8Toast?.('تمت مزامنة بيانات الحساب وإنشاء/التحقق من النسخة الاحتياطية','success');
          retryMs=15000;
          return true;
        }catch(err){
          if(/SYNC_REVISION_CONFLICT/i.test(String(err?.message||''))&&attempt<2)continue;
          throw err;
        }
      }
      throw new Error('SYNC_RETRY_EXHAUSTED');
    }catch(err){
      const msg=String(err?.message||err);
      const friendly=/CLOUD_SNAPSHOT_MISSING_BLOCKED/.test(msg)
        ?'⛔ النسخة السحابية المتوقعة غير موجودة. أوقفنا الرفع حتى لا نستبدل بيانات الحساب.'
        :/CLOUD_SNAPSHOT_COUNT_MISMATCH/.test(msg)
          ?'⛔ أعداد النسخة السحابية لا تطابق محتواها. لم يتم تعديل السحابة.'
          :/DESTRUCTIVE_SYNC_CONFIRM_REQUIRED|EMPTY_REPLACEMENT_BLOCKED/.test(msg)
            ?'⛔ الخادم منع تقليل البيانات دون تأكيد صريح. راجع النسخة الحالية.'
            :/SYNC_CLIENT_UPGRADE_REQUIRED/.test(msg)
              ?'يلزم تحديث التطبيق إلى RC30 قبل استئناف المزامنة السحابية.'
              :/OperationError|ACCOUNT_MISMATCH/.test(msg)
                ?'تعذر فك النسخة؛ تحقق من كلمة التشفير والحساب.'
                :'فشلت المزامنة الآمنة: '+msg.slice(0,220);
      renderSyncStatus?.(friendly,true);
      if(!opts.silent)v8Toast?.('لم تكتمل المزامنة؛ بيانات الجهاز المحلية لم تُحذف','error');
      console.warn('[RC30 protected sync]',msg);
      return false;
    }finally{inFlight=false;V8.syncing=false;}
  }

  function scheduleCloudPush(){
    if(!settings.sync?.auto)return;
    clearTimeout(retryTimer);
    retryTimer=setTimeout(()=>{void pushCloudSync({silent:true});},3500);
  }
  async function autoCloudSync(){
    if(!settings.sync?.auto)return false;
    return pushCloudSync({silent:true});
  }
  function scheduleRetry(reason,delay=1200){
    if(!settings.sync?.auto)return;
    clearTimeout(retryTimer);
    retryTimer=setTimeout(()=>{retryTimer=null;void autoCloudSync();},Math.max(500,delay));
  }
  function start(){
    if(started)return;started=true;
    g.addEventListener?.('online',()=>scheduleRetry('online',900));
    g.addEventListener?.('offline',()=>renderSyncStatus?.('انقطع الإنترنت؛ التغييرات محفوظة محليًا وستُرفع تلقائيًا عند عودة الاتصال.'));
    g.document?.addEventListener?.('visibilitychange',()=>{if(g.document.visibilityState==='visible')scheduleRetry('resume',1200);});
    pollTimer=g.setInterval?.(()=>{if(g.navigator?.onLine!==false)scheduleRetry('periodic',1000);},15*60*1000);
    if(settings.sync?.auto)scheduleRetry('boot',1800);
    setCloudBackupStatus('النسخ السحابية اليومية مشفرة وتُنشأ بعد أول مزامنة ناجحة.');
  }

  const baseRender=g.renderSyncStatus;
  if(typeof baseRender==='function'){
    g.renderSyncStatus=function(msg='',isErr=false){
      baseRender(msg,isErr);
      const el=$('syncStatus');
      if(el&&settings.sync?.auto&&!String(msg||'').trim()){
        const last=settings.sync.lastBackupAt;
        if(last)el.textContent+=' · آخر نسخة يومية: '+new Date(last).toLocaleDateString('ar-EG');
      }
    };
  }
  g.pullRemoteIntoLocal=pullRemoteIntoLocal;
  g.pushCloudSync=pushCloudSync;
  g.autoCloudSync=autoCloudSync;
  g.scheduleCloudPush=scheduleCloudPush;

  // Restore an administrator-downloaded encrypted JSON file to the same teacher account.
  async function restoreEncryptedCloudBackup(event){
    const file=event?.target?.files?.[0];if(!file)return;
    const old={students,sessions,tasks,settings};
    try{
      if(g.navigator?.onLine===false)throw new Error('RESTORE_REQUIRES_INTERNET');
      const envelope=JSON.parse(await file.text());
      if(envelope?.format!=='wlq-encrypted-cloud-backup-v1'||envelope?.encrypted!==true||!envelope?.payload)throw new Error('INVALID_BACKUP_FILE');
      const access=g.WeLiveQuranAuth?.getAccess?.();
      const ownerId=String(envelope.owner_user_id||envelope.teacher_id||'');
      if(!access?.user_id||ownerId!==String(access.user_id))throw new Error('BACKUP_ACCOUNT_MISMATCH');
      const pass=String(settings.sync?.passphrase||g.prompt?.('أدخل كلمة تشفير المزامنة الخاصة بهذا المحفظ لاستعادة النسخة:')||'');
      if(pass.length<8)throw new Error('SYNC_PASSPHRASE_REQUIRED');
      const decoded=await decryptSyncPayload(envelope.payload,pass);
      if(decoded.ownerUserId&&decoded.ownerUserId!==access.user_id)throw new Error('BACKUP_ACCOUNT_MISMATCH');
      if(!Array.isArray(decoded.students)||!Array.isArray(decoded.sessions)||!Array.isArray(decoded.tasks))throw new Error('INVALID_BACKUP_CONTENT');
      const safe=sanitizeBackupData(decoded);
      const nextCounts=countsOf(safe);
      if(!g.confirm?.(`سيتم استبدال بيانات هذا الحساب بالنسخة المؤرخة ${new Date(envelope.created_at||Date.now()).toLocaleString('ar-EG')}\n\nالطلاب: ${nextCounts.students} · الحصص: ${nextCounts.sessions} · المهام: ${nextCounts.tasks}\n\nسيتم تحديث النسخة السحابية أيضًا. هل تريد المتابعة؟`))return;
      const rows=await callAccountSyncRpc('account_sync_pull_v3',{});
      const row=Array.isArray(rows)?rows[0]:rows;
      const expected=Number(row?.revision)||0;
      const localSync={...(settings.sync||{}),passphrase:pass,auto:true};
      const localSecurity=settings.security,owner=settings.accountOwner;
      students=safe.students;sessions=safe.sessions;tasks=safe.tasks||[];
      settings={...settings,...(decoded.settings||{}),sync:localSync,security:localSecurity,accountOwner:owner,
        syncTombstones:decoded.tombstones||decoded.settings?.syncTombstones||settings.syncTombstones};
      const encrypted=await encryptSyncPayload(cloudPayload(),pass);
      let result;
      try{
        result=await callAccountSyncRpc('account_sync_push_v3',{
          p_payload:encrypted,p_expected_revision:expected,
          p_student_count:nextCounts.students,p_session_count:nextCounts.sessions,p_task_count:nextCounts.tasks,
          p_source_device_id:String(localSync.deviceId||''),p_allow_destructive:true
        });
      }catch(err){students=old.students;sessions=old.sessions;tasks=old.tasks;settings=old.settings;throw err;}
      if(result?.ok!==true)throw new Error('RESTORE_NOT_CONFIRMED');
      settings.sync.serverRevision=Number(result.revision)||expected+1;
      settings.sync.lastCloudCounts=nextCounts;
      settings.sync.lastCloudFingerprint=await fingerprint();
      settings.sync.lastPush=new Date().toISOString();
      persistBase();
      await dailyCloudBackup().catch(()=>{});
      renderHome?.();renderSt?.();renderV8Settings?.();
      v8Toast?.('تمت استعادة النسخة المشفرة محليًا وسحابيًا','success');
    }catch(err){
      students=old.students;sessions=old.sessions;tasks=old.tasks;settings=old.settings;
      const message=String(err?.message||err);
      v8Toast?.(/RESTORE_REQUIRES_INTERNET/.test(message)?'استعادة النسخة السحابية تحتاج اتصالًا بالإنترنت':/BACKUP_ACCOUNT_MISMATCH/.test(message)?'هذه النسخة تخص حساب محفظ آخر':/OperationError/.test(message)?'كلمة التشفير غير صحيحة أو الملف تالف':'تعذر استعادة النسخة: '+message.slice(0,160),'error');
    }finally{if(event?.target)event.target.value='';}
  }
  const baseInit=g.initV8Layer;
  if(typeof baseInit==='function'){
    g.initV8Layer=async function(){const result=await baseInit.apply(this,arguments);start();return result;};
  }
  g.ImamApp=g.ImamApp||{};
  g.ImamApp.DataProtection={start,pushCloudSync,autoCloudSync,pullRemoteIntoLocal,dailyCloudBackup,restoreEncryptedCloudBackup};
})(globalThis);

