import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SUPABASE_ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")||"";
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ALLOWED_ORIGINS=new Set([
  "https://welivequran.online",
  "https://www.welivequran.online",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);
const admin=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const authClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

function json(body:unknown,status=200,headers:Record<string,string>={}) {
  return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}});
}
function cors(req:Request):Record<string,string>|null {
  const origin=req.headers.get("origin");
  if(!origin)return {};
  if(!ALLOWED_ORIGINS.has(origin))return null;
  return {"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400","Vary":"Origin"};
}
function clean(value:unknown,max:number) {
  return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);
}
function validStudentRef(value:unknown) {
  return /^[0-9a-f]{64}$/.test(String(value||""));
}
function validDay(value:unknown) {
  const s=clean(value,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const d=new Date(s+"T00:00:00.000Z");
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;
}
async function teacherAccess(req:Request) {
  const bearer=String(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!bearer)throw new Error("TEACHER_AUTH_REQUIRED");
  const {data,error}=await authClient.auth.getUser(bearer);
  if(error||!data?.user?.id)throw new Error("TEACHER_AUTH_INVALID");
  const {data:profile,error:profileError}=await admin.from("app_users").select("user_id,status,role").eq("user_id",data.user.id).maybeSingle();
  if(profileError)throw new Error("TEACHER_PROFILE_LOOKUP_FAILED");
  if(!profile||profile.status!=="active"||!["owner","teacher"].includes(profile.role))throw new Error("TEACHER_NOT_ACTIVE");
  return {ownerId:data.user.id};
}
async function listLearningData(ownerId:string,body:Record<string,unknown>) {
  const raw=Array.isArray(body.student_refs)?body.student_refs:[];
  if(raw.length>200)throw new Error("STUDENT_REF_BATCH_TOO_LARGE");
  const refs=[...new Set(raw.map(x=>String(x)))];
  if(refs.some(x=>!validStudentRef(x)))throw new Error("STUDENT_REF_INVALID");
  const offset=Number(body.event_offset??0);
  if(!Number.isInteger(offset)||offset<0||offset>100000)throw new Error("EVENT_OFFSET_INVALID");
  let events:any[]=[];
  if(refs.length) {
    const result=await admin.from("student_achievement_events")
      .select("id,student_ref,source,source_ref,event_type,category,points,approved_by,approved_at,occurred_at,idempotency_key,note,created_at")
      .eq("owner_user_id",ownerId).in("student_ref",refs)
      .order("approved_at",{ascending:false}).order("id",{ascending:true})
      .range(offset,offset+999);
    if(result.error)throw new Error("LEARNING_EVENTS_READ_FAILED");
    events=result.data||[];
  }
  const competitions=await admin.from("student_learning_competitions")
    .select("id,title,scope,student_refs,group_names,opt_in,start_date,end_date,status,created_by,created_at,closed_by,closed_at")
    .eq("owner_user_id",ownerId).order("created_at",{ascending:false}).limit(200);
  if(competitions.error)throw new Error("LEARNING_COMPETITIONS_READ_FAILED");
  return json({events,has_more:events.length===1000,competitions:competitions.data||[]});
}
async function approveQuiz(ownerId:string,body:Record<string,unknown>) {
  const studentRef=String(body.student_ref||"");
  if(!validStudentRef(studentRef))throw new Error("STUDENT_REF_INVALID");
  const attemptId=clean(body.attempt_id,100);
  const category=clean(body.category,40);
  const categories=new Set(["foundation","tajweed","makharij","mutashabihat","surah","verse_completion","next_ayah","memorization"]);
  if(!attemptId||!categories.has(category))throw new Error("QUIZ_ATTEMPT_INVALID");
  const questionCount=Number(body.question_count),correctCount=Number(body.correct_count);
  if(!Number.isInteger(questionCount)||questionCount<1||questionCount>20||!Number.isInteger(correctCount)||correctCount<0||correctCount>questionCount)throw new Error("QUIZ_SCORE_INVALID");
  const points=Math.min(20,correctCount*2);
  const idempotencyKey="quiz:"+studentRef+":"+attemptId+":approved";
  const payload={
    id:crypto.randomUUID(),owner_user_id:ownerId,student_ref:studentRef,source:"teacher-approved-quiz",
    source_ref:attemptId,event_type:"quiz_completed",category,points,approved_by:ownerId,
    note:clean(category+" "+correctCount+"/"+questionCount,300),idempotency_key:idempotencyKey
  };
  const inserted=await admin.from("student_achievement_events").insert(payload).select("id,student_ref,source,source_ref,event_type,category,points,approved_by,approved_at,occurred_at,idempotency_key,note,created_at").single();
  if(!inserted.error)return json({event:inserted.data,added:true});
  if(inserted.error.code==="23505") {
    const existing=await admin.from("student_achievement_events")
      .select("id,student_ref,source,source_ref,event_type,category,points,approved_by,approved_at,occurred_at,idempotency_key,note,created_at")
      .eq("owner_user_id",ownerId).eq("idempotency_key",idempotencyKey).maybeSingle();
    if(existing.error)throw new Error("LEARNING_EVENT_RECHECK_FAILED");
    if(existing.data)return json({event:existing.data,added:false});
  }
  throw new Error("LEARNING_EVENT_WRITE_FAILED");
}
async function createCompetition(ownerId:string,body:Record<string,unknown>) {
  const title=clean(body.title,100),scope=clean(body.scope,30);
  const startDate=clean(body.start_date,10),endDate=clean(body.end_date,10);
  const refsRaw=Array.isArray(body.student_refs)?body.student_refs:[];
  const refs=[...new Set(refsRaw.map(x=>String(x)))];
  const groupsRaw=Array.isArray(body.group_names)?body.group_names:[];
  const groups=[...new Set(groupsRaw.map(x=>clean(x,100)).filter(Boolean))];
  const optIn=body.opt_in===true;
  if(!title||!validDay(startDate)||!validDay(endDate)||endDate<startDate)throw new Error("COMPETITION_DATES_INVALID");
  if(!refs.length||refs.length>200||refs.some(x=>!validStudentRef(x)))throw new Error("COMPETITION_STUDENTS_INVALID");
  if(groups.length>50)throw new Error("COMPETITION_GROUPS_INVALID");
  if(scope==="individual"&&(refs.length!==1||groups.length!==0||optIn))throw new Error("COMPETITION_SCOPE_INVALID");
  if(scope==="circle"&&(groups.length!==1||optIn))throw new Error("COMPETITION_SCOPE_INVALID");
  if(scope==="circle-to-circle"&&(groups.length<2||!optIn))throw new Error("COMPETITION_OPT_IN_REQUIRED");
  if(!["individual","circle","circle-to-circle"].includes(scope))throw new Error("COMPETITION_SCOPE_INVALID");
  const result=await admin.from("student_learning_competitions").insert({
    id:crypto.randomUUID(),owner_user_id:ownerId,title,scope,student_refs:refs,group_names:groups,opt_in:optIn,
    start_date:startDate,end_date:endDate,status:"active",created_by:ownerId
  }).select("id,title,scope,student_refs,group_names,opt_in,start_date,end_date,status,created_by,created_at,closed_by,closed_at").single();
  if(result.error)throw new Error("LEARNING_COMPETITION_WRITE_FAILED");
  return json({competition:result.data});
}
async function closeCompetition(ownerId:string,body:Record<string,unknown>) {
  const id=String(body.competition_id||"");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new Error("COMPETITION_ID_INVALID");
  const updated=await admin.from("student_learning_competitions")
    .update({status:"closed",closed_at:new Date().toISOString(),closed_by:ownerId})
    .eq("id",id).eq("owner_user_id",ownerId).eq("status","active")
    .select("id,title,scope,student_refs,group_names,opt_in,start_date,end_date,status,created_by,created_at,closed_by,closed_at").maybeSingle();
  if(updated.error)throw new Error("LEARNING_COMPETITION_CLOSE_FAILED");
  if(updated.data)return json({competition:updated.data,closed:true});
  const existing=await admin.from("student_learning_competitions")
    .select("id,title,scope,student_refs,group_names,opt_in,start_date,end_date,status,created_by,created_at,closed_by,closed_at")
    .eq("id",id).eq("owner_user_id",ownerId).maybeSingle();
  if(existing.error)throw new Error("LEARNING_COMPETITION_READ_FAILED");
  if(!existing.data)throw new Error("COMPETITION_NOT_FOUND");
  return json({competition:existing.data,closed:existing.data.status==="closed"});
}
Deno.serve(async(req:Request)=>{
  const corsHeaders=cors(req);
  if(corsHeaders===null)return json({error:"ORIGIN_NOT_ALLOWED"},403);
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405,corsHeaders);
  try{
    if(!SUPABASE_URL||!SUPABASE_ANON_KEY||!SERVICE_ROLE_KEY)throw new Error("LEARNING_LEDGER_NOT_CONFIGURED");
    const {ownerId}=await teacherAccess(req);
    const body=await req.json().catch(()=>null);
    if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("INVALID_JSON");
    switch(clean((body as Record<string,unknown>).action,40)){
      case "list":return await listLearningData(ownerId,body as Record<string,unknown>);
      case "approve_quiz":return await approveQuiz(ownerId,body as Record<string,unknown>);
      case "create_competition":return await createCompetition(ownerId,body as Record<string,unknown>);
      case "close_competition":return await closeCompetition(ownerId,body as Record<string,unknown>);
      default:throw new Error("ACTION_NOT_ALLOWED");
    }
  }catch(error){
    const code=error instanceof Error?error.message:"LEARNING_LEDGER_FAILED";
    const status=code==="TEACHER_AUTH_REQUIRED"||code==="TEACHER_AUTH_INVALID"?401:
      code==="TEACHER_NOT_ACTIVE"?403:
      code==="COMPETITION_NOT_FOUND"?404:
      code==="ORIGIN_NOT_ALLOWED"?403:400;
    const exposed=new Set(["TEACHER_AUTH_REQUIRED","TEACHER_AUTH_INVALID","TEACHER_PROFILE_LOOKUP_FAILED","TEACHER_NOT_ACTIVE","STUDENT_REF_INVALID","STUDENT_REF_BATCH_TOO_LARGE","QUIZ_ATTEMPT_INVALID","QUIZ_SCORE_INVALID","COMPETITION_DATES_INVALID","COMPETITION_STUDENTS_INVALID","COMPETITION_GROUPS_INVALID","COMPETITION_SCOPE_INVALID","COMPETITION_OPT_IN_REQUIRED","COMPETITION_ID_INVALID","COMPETITION_NOT_FOUND","ACTION_NOT_ALLOWED","INVALID_JSON","LEARNING_LEDGER_NOT_CONFIGURED"]);
    return json({error:exposed.has(code)?code:"LEARNING_LEDGER_FAILED"},status,corsHeaders);
  }
});
