import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const required = ["RC16_STAGING_SUPABASE_URL","RC16_STAGING_SUPABASE_ANON_KEY","RC16_STAGING_TEACHER_A_EMAIL","RC16_STAGING_TEACHER_A_PASSWORD","RC16_STAGING_TEACHER_B_EMAIL","RC16_STAGING_TEACHER_B_PASSWORD"];
for (const key of required) if (!process.env[key]) throw new Error("Missing required environment variable: " + key);
const baseUrl = process.env.RC16_STAGING_SUPABASE_URL.replace(/\/+$/, "");
const anonKey = process.env.RC16_STAGING_SUPABASE_ANON_KEY;
const runId = process.env.GITHUB_RUN_ID || process.env.RC16_STAGING_RUN_ID || String(Date.now());
const endpoint = baseUrl + "/functions/v1/rc16-learning-ledger";
async function login(email,password) {
  const response=await fetch(baseUrl+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:anonKey,"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  const body=await response.json().catch(()=>({}));
  assert.equal(response.ok,true,"Staging teacher login failed: "+(body.msg||body.message||response.status));
  assert.ok(body.access_token&&body.user&&body.user.id,"Supabase Auth did not return a valid teacher session");
  return {token:body.access_token,userId:body.user.id};
}
async function call(token,action,payload={}) {
  const response=await fetch(endpoint,{method:"POST",headers:{apikey:anonKey,Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({action,...payload})});
  return {response,body:await response.json().catch(()=>({}))};
}
async function success(result,label) {
  assert.equal(result.response.ok,true,label+" failed: "+JSON.stringify(result.body));
  return result.body;
}
async function assertDirectDenied(token,table) {
  const response=await fetch(baseUrl+"/rest/v1/"+table+"?select=id&limit=1",{headers:{apikey:anonKey,Authorization:"Bearer "+token}});
  assert.equal(response.ok,false,"Direct browser table access unexpectedly succeeded: "+table);
}
const [a,b]=await Promise.all([login(process.env.RC16_STAGING_TEACHER_A_EMAIL,process.env.RC16_STAGING_TEACHER_A_PASSWORD),login(process.env.RC16_STAGING_TEACHER_B_EMAIL,process.env.RC16_STAGING_TEACHER_B_PASSWORD)]);
assert.notEqual(a.userId,b.userId,"The two staging test accounts must be different users");
const studentRef=createHash("sha256").update("guardian-portal-v1|"+a.userId+"|rc16-staging-acceptance-"+runId).digest("hex");
const attemptId="rc16-staging-acceptance-"+runId,requestKey="rc16-staging-competition-"+runId;
const approval1=await success(await call(a.token,"approve_quiz",{student_ref:studentRef,attempt_id:attemptId,category:"foundation",question_count:1,correct_count:1}),"Teacher A quiz approval");
assert.equal(approval1.event.points,2,"Server-calculated score must be 2 for one correct answer");
const approval2=await success(await call(a.token,"approve_quiz",{student_ref:studentRef,attempt_id:attemptId,category:"foundation",question_count:1,correct_count:1}),"Quiz approval retry");
assert.equal(approval2.added,false,"Retry must not create a duplicate achievement");
assert.equal(approval2.event.id,approval1.event.id,"Retry must return the original achievement");
const listA=await success(await call(a.token,"list",{student_refs:[studentRef],event_offset:0}),"Teacher A ledger read");
assert.ok(listA.events.some(row=>row.id===approval1.event.id),"Teacher A must see their own event");
const listB=await success(await call(b.token,"list",{student_refs:[studentRef],event_offset:0}),"Teacher B cross-account read");
assert.ok(!listB.events.some(row=>row.id===approval1.event.id),"Teacher B must not see Teacher A's event");
const competitionPayload={title:"RC16 acceptance test "+runId,scope:"individual",student_refs:[studentRef],participant_groups:[{student_ref:studentRef,group_name:""}],group_names:[],opt_in:false,start_date:new Date().toISOString().slice(0,10),end_date:"2099-12-31",request_key:requestKey};
const competition1=await success(await call(a.token,"create_competition",competitionPayload),"Competition creation");
const competition2=await success(await call(a.token,"create_competition",competitionPayload),"Competition retry");
assert.equal(competition2.added,false,"Competition retry must not create a duplicate");
assert.equal(competition2.competition.id,competition1.competition.id,"Retry must return the original competition");
const listBAfter=await success(await call(b.token,"list",{student_refs:[studentRef],event_offset:0}),"Teacher B competition isolation");
assert.ok(!listBAfter.competitions.some(row=>row.id===competition1.competition.id),"Teacher B must not see Teacher A's competition");
const forbiddenClose=await call(b.token,"close_competition",{competition_id:competition1.competition.id});
assert.equal(forbiddenClose.response.status,404,"Teacher B must not close another account's competition");
assert.equal(forbiddenClose.body.error,"COMPETITION_NOT_FOUND");
const closed=await success(await call(a.token,"close_competition",{competition_id:competition1.competition.id}),"Competition close");
assert.equal(closed.competition.status,"closed");
const closeRetry=await success(await call(a.token,"close_competition",{competition_id:competition1.competition.id}),"Competition close retry");
assert.equal(closeRetry.closed,true);
for(const table of ["student_achievement_events","student_learning_competitions"]){await assertDirectDenied(a.token,table);await assertDirectDenied(b.token,table);}
const noAuth=await fetch(endpoint,{method:"POST",headers:{apikey:anonKey,"Content-Type":"application/json"},body:JSON.stringify({action:"list",student_refs:[studentRef],event_offset:0})});
assert.equal(noAuth.ok,false,"Unauthenticated Edge Function requests must be rejected");
const badOrigin=await fetch(endpoint,{method:"POST",headers:{apikey:anonKey,Authorization:"Bearer "+a.token,Origin:"https://rc16-origin-denied.invalid","Content-Type":"application/json"},body:JSON.stringify({action:"list",student_refs:[studentRef],event_offset:0})});
assert.equal(badOrigin.status,403,"Unapproved browser origins must be rejected");
console.log("PASS RC16 staging acceptance: two accounts, owner isolation, direct-table denial, idempotent quiz/competition, close-only permissions, JWT and CORS.");
console.log("Synthetic append-only staging records created with run key "+runId+"; retained intentionally, with no student names or direct identifiers.");
