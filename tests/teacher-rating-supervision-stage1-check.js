'use strict';
const fs=require('fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(f,'utf8');
const sql=read('sql/teacher-ratings-supervision.sql'),rating=read('js/features/guardian-ratings.js'),supervisor=read('js/features/supervisor-dashboard.js');
const portal=read('guardian-portal.html'),view=read('js/features/guardian-portal-view.js'),teacher=read('index.html'),auth=read('auth.js'),sw=read('sw.js');
for(const f of ['js/features/guardian-ratings.js','js/features/supervisor-dashboard.js','js/features/guardian-portal-view.js','auth.js','sw.js'])new vm.Script(read(f),{filename:f});
for(const table of ['app_supervisor_grants','guardian_teacher_ratings','app_supervision_audit']){
 assert.match(sql,new RegExp(`create table if not exists public\\.${table}`));
 assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
 assert.match(sql,new RegExp(`revoke all on public\\.${table} from public, anon, authenticated`));
}
for(const func of ['guardian_teacher_rating_submit','guardian_teacher_rating_session_get','app_supervisor_assign','app_supervision_access','app_supervision_dashboard','app_supervision_students','app_supervision_rating_details','app_supervision_audit_feed'])assert.ok(sql.includes(func),'missing '+func);
assert.match(sql,/sess\.expires_at>now\(\)/);assert.match(sql,/sess\.revoked_at is null/);assert.match(sql,/sh\.student_ref=p_student_ref/);assert.match(sql,/ac\.disabled_at is null/);
assert.match(sql,/if not public\.app_supervisor_authorized\(v_actor\) then raise exception 'SUPERVISOR_REQUIRED'/);
assert.match(sql,/where user_id=v_actor and role='owner' and status='active'/);
assert.match(sql,/unique\(owner_user_id,guardian_account_id,student_ref\)/);
assert.match(sql,/private_note text not null default '' check \(char_length\(private_note\)<=800\)/);
assert.match(sql,/insert into public\.app_supervision_audit/);assert.match(sql,/grant execute on function public\.guardian_teacher_rating_submit\(uuid,text,jsonb,text\) to anon,authenticated/);
assert.ok(!/\b(drop|truncate)\b|\bdelete\s+from\b|alter\s+table\s+public\.app_users/i.test(sql),'No destructive SQL or alteration of app users allowed');
assert.ok(!/phone_hash|pin_hash|ip_address|user_agent/i.test(sql),'Sensitive login metadata must not be persisted in ratings/supervision');
assert.match(portal,/id="portalRatingCard" hidden/);assert.match(portal,/id="portalRatingNav"[^>]+hidden/);assert.match(portal,/id="portalRatingSend"/);
for(const metric of ['punctuality','teaching','followup','kindness','benefit','clarity'])assert.match(portal,new RegExp('portalRating_'+metric));
assert.match(view,/ImamGuardianRatings\?\.clear\?\.\(\)/);assert.match(view,/ImamGuardianRatings\?\.setContext\?\.\(\{sessionToken,studentRef:row\.student_ref\}\)/);
assert.match(rating,/guardian_teacher_rating_submit/);assert.match(rating,/guardian_teacher_rating_session_get/);assert.match(rating,/if\(!context\?\.sessionToken\|\|!context\?\.studentRef\)return/);
assert.match(supervisor,/app_supervision_access/);assert.match(supervisor,/if\(!allowed\)return/);assert.match(supervisor,/app_supervisor_assign/);
assert.match(auth,/ImamApp\?\.Supervision\?\.initialize/);
for(const file of ['./teacher-rating.css?v=11.7.0-s1','./js/features/guardian-ratings.js?v=11.7.0-s1','./js/features/supervisor-dashboard.js?v=11.7.0-s1'])assert.ok(sw.includes(file),'Missing offline asset '+file);
assert.match(sw,/const CACHE_NAME = 'quran-pwa-v11\.7\.0-teacher-ratings1'/);
assert.match(read('js/core/runtime.js'),/schema:12/);
assert.ok(!/navigator\.share|wa\.me/.test(rating+supervisor),'Do not touch WhatsApp behavior');
// Interactive test: rating hidden for public mode, loaded for verified context, send not permitted without token.
(async()=>{
 let calls=[];const nodes={};
 function element(id){return nodes[id]||(nodes[id]={id,hidden:true,value:'',textContent:'',disabled:false,addEventListener(type,fn){this[type]=fn;}});}
 const ctx={document:{readyState:'complete',getElementById:element},navigator:{onLine:true},fetch:async(url,opt)=>{calls.push({url,args:JSON.parse(opt.body)});return {ok:true,json:async()=>url.endsWith('session_get')?{rating:null}:{ok:true}};},console};ctx.globalThis=ctx;
 vm.runInNewContext(rating,ctx);
 ctx.ImamGuardianRatings.setContext({});assert.equal(element('portalRatingCard').hidden,true);assert.equal(calls.length,0);
 ctx.ImamGuardianRatings.setContext({sessionToken:'valid-session',studentRef:'a'.repeat(64)});
 await new Promise(done=>setImmediate(done));assert.equal(element('portalRatingCard').hidden,false);
 assert.ok(calls.some(x=>x.url.includes('session_get')));
 await element('portalRatingSend').click?.(); // would not send if all selector values are unselected
 assert.ok(!calls.some(x=>x.url.includes('rating_submit')),'No implicit all-5-star submission');
 ctx.ImamGuardianRatings.clear();assert.equal(element('portalRatingCard').hidden,true);
 console.log('PASS teacher-rating-supervision-stage1: role grants, audit, PIN, private RLS, SW, DOM isolation and no blind score');
})().catch(e=>{console.error(e);process.exitCode=1;});
