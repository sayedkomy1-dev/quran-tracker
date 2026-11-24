import { createClient } from "npm:@supabase/supabase-js@2";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"",SUPABASE_ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")||"",SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",GEMINI_API_KEY=Deno.env.get("GEMINI_API_KEY")||"",GEMINI_MODEL=Deno.env.get("GEMINI_MODEL")||"gemini-2.5-flash";
const BUCKET="imam-home-recitations",MAX_BYTES=20*1024*1024,MAX_DURATION_MS=20*60*1000,MAX_DAILY_REVIEWS=5;
const ALLOWED_ORIGINS=new Set(["https://welivequran.online","https://www.welivequran.online","http://localhost:3000","http://127.0.0.1:3000","http://localhost:5500","http://127.0.0.1:5500"]);
const admin=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const authClient=createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
function json(body:unknown,status=200,headers:HeadersInit={}){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json; charset=utf-8",...headers}});}
function cors(req:Request):Record<string,string>|null{const origin=req.headers.get("origin");if(!origin)return{};if(!ALLOWED_ORIGINS.has(origin))return null;return{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Max-Age":"86400","Vary":"Origin"};}
function clean(value:unknown,max:number){return String(value??"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);}
function validUuid(value:unknown){return/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||""));}
async function teacherAccess(req:Request){
 const bearer=String(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();if(!bearer||bearer===SUPABASE_ANON_KEY)throw Error("TEACHER_AUTH_REQUIRED");
 const {data,error}=await authClient.auth.getUser(bearer);if(error||!data?.user?.id)throw Error("TEACHER_AUTH_INVALID");
 const {data:profile,error:profileError}=await admin.from("app_users").select("user_id,status,role").eq("user_id",data.user.id).maybeSingle();if(profileError)throw profileError;
 if(!profile||profile.status!=="active"||!["owner","teacher"].includes(profile.role))throw Error("TEACHER_NOT_ACTIVE");
 return{ownerId:data.user.id};
}
function audioSignature(bytes:Uint8Array,mime:string){
 const starts=(a:number,b:number,c:number,d:number)=>bytes[0]===a&&bytes[1]===b&&bytes[2]===c&&bytes[3]===d;
 if(mime==="audio/webm")return starts(0x1a,0x45,0xdf,0xa3);
 if(mime==="audio/ogg")return starts(0x4f,0x67,0x67,0x53);
 if(mime==="audio/wav")return starts(0x52,0x49,0x46,0x46)&&bytes[8]===0x57&&bytes[9]===0x41&&bytes[10]===0x56&&bytes[11]===0x45;
 if(mime==="audio/mpeg")return (bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33)||(bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0);
 if(mime==="audio/mp4")return bytes.length>12&&bytes[4]===0x66&&bytes[5]===0x74&&bytes[6]===0x79&&bytes[7]===0x70;
 if(mime==="audio/aac")return bytes[0]===0xff&&(bytes[1]&0xf6)===0xf0;
 return false;
}
function toBase64(bytes:Uint8Array){let binary="";const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));return btoa(binary);}
function parseModelJson(text:string){const raw=String(text||"").trim().replace(/^\x60\x60\x60(?:json)?\s*/i,"").replace(/\s*\x60\x60\x60$/,"");try{return JSON.parse(raw);}catch(_){throw Error("AI_RESPONSE_INVALID");}}
function normalizeResult(value:unknown){const input=value&&typeof value==="object"?value as Record<string,unknown>:{},differences=(Array.isArray(input.differences)?input.differences:[]).slice(0,20).map(item=>{const row=item&&typeof item==="object"?item as Record<string,unknown>:{};return{kind:["omission","addition","substitution","uncertain"].includes(String(row.kind))?String(row.kind):"uncertain",expected:clean(row.expected,300),heard:clean(row.heard,300),note:clean(row.note,400),time_ms:null};});return{transcript_candidate:clean(input.transcript_candidate,5000),differences,limitations:"هذا تحليل آلي استرشادي غير مُعاير. لا يثبت صحة التلاوة أو التجويد أو المخارج، ولا يحدد توقيت الخطأ. يجب على المحفظ مراجعة التسجيل والمصحف واعتماد أي ملاحظة يدويًا."};}
async function handle(req:Request):Promise<Response>{
 const headers=cors(req);if(headers===null)return json({ok:false,error:"ORIGIN_NOT_ALLOWED"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers||{}});
 if(req.method!=="POST")return json({ok:false,error:"METHOD_NOT_ALLOWED"},405,headers||{});
 if(!SUPABASE_URL||!SUPABASE_ANON_KEY||!SERVICE_ROLE_KEY)return json({ok:false,error:"SERVER_NOT_CONFIGURED"},503,headers||{});
 if((req.headers.get("apikey")||"")!==SUPABASE_ANON_KEY)return json({ok:false,error:"API_KEY_INVALID"},401,headers||{});
 try{
  const {ownerId}=await teacherAccess(req);if(!GEMINI_API_KEY)return json({ok:false,error:"AI_NOT_CONFIGURED",message:"خدمة التحليل غير مفعلة بعد؛ لم يتم إنشاء نتيجة بديلة."},503,headers||{});
  let body:Record<string,unknown>;try{body=await req.json();}catch(_){throw Error("INVALID_JSON");}
  const submissionId=String(body.submission_id||""),referenceText=clean(body.reference_text,5000);if(!validUuid(submissionId))throw Error("SUBMISSION_ID_INVALID");
  const {data:submission,error:submissionError}=await admin.from("student_recitation_submissions").select("id,owner_user_id,storage_path,mime_type,file_size_bytes,duration_ms,status,uploaded_at,archived_at,surah_no,ayah_from,ayah_to").eq("id",submissionId).eq("owner_user_id",ownerId).maybeSingle();
  if(submissionError)throw submissionError;
  if(!submission||submission.archived_at||submission.status==="archived"||!submission.uploaded_at||!["submitted","reviewing","feedback_ready"].includes(submission.status))throw Error("SUBMISSION_NOT_AVAILABLE");
  if(!Number.isInteger(Number(submission.file_size_bytes))||Number(submission.file_size_bytes)<128||Number(submission.file_size_bytes)>MAX_BYTES)throw Error("AUDIO_SIZE_INVALID");
  if(!Number.isInteger(Number(submission.duration_ms))||Number(submission.duration_ms)<=0||Number(submission.duration_ms)>MAX_DURATION_MS)throw Error("AUDIO_DURATION_INVALID");
  const since=new Date(Date.now()-24*60*60*1000).toISOString(),quota=await admin.from("student_recitation_ai_reviews").select("id",{count:"exact",head:true}).eq("owner_user_id",ownerId).gte("created_at",since);
  if(quota.error)throw quota.error;if((quota.count||0)>=MAX_DAILY_REVIEWS)throw Error("AI_DAILY_LIMIT");
  const downloaded=await admin.storage.from(BUCKET).download(submission.storage_path);if(downloaded.error||!downloaded.data)throw Error("AUDIO_DOWNLOAD_FAILED");
  const file=downloaded.data;if(file.size>MAX_BYTES||file.size!==Number(submission.file_size_bytes))throw Error("AUDIO_SIZE_INVALID");
  const bytes=new Uint8Array(await file.arrayBuffer());if(!audioSignature(bytes,submission.mime_type))throw Error("AUDIO_SIGNATURE_INVALID");
  const prompt=["You are a conservative assistant for a Quran teacher reviewing a student's Arabic recitation.","Listen to the attached real audio. Return JSON only with keys transcript_candidate and differences.","transcript_candidate is only a tentative speech transcription; it is not verified Quran text.","If teacher_reference_text is present, compare only against that exact text and suggest possible omissions, additions, substitutions, or uncertain portions.","If teacher_reference_text is empty, return an empty differences array and do not claim that a recitation error was found.","Do not diagnose tajweed, makharij, articulation defects, or assign grades, scores, or a pass/fail result.","Do not invent timestamps. Do not include time_ms values.","Use short Arabic notes and conservative language. Mark uncertain cases as uncertain.","Teacher reference text (may be empty):",referenceText].join("\n");
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(GEMINI_MODEL)+":generateContent?key="+encodeURIComponent(GEMINI_API_KEY),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt},{inline_data:{mime_type:submission.mime_type,data:toBase64(bytes)}}]}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}})});
  if(!response.ok){const detail=await response.text().catch(()=>"");console.error("[teacher-recitation-analysis] provider status",response.status,detail.slice(0,300));if(response.status===429)throw Error("AI_RATE_LIMITED");throw Error("AI_PROVIDER_UNAVAILABLE");}
  const provider=await response.json(),modelText=(provider?.candidates?.[0]?.content?.parts||[]).map((part:Record<string,unknown>)=>String(part.text||"")).join("\n");if(!modelText)throw Error("AI_RESPONSE_EMPTY");
  const result=normalizeResult(parseModelJson(modelText)),reviewId=crypto.randomUUID();
  const inserted=await admin.from("student_recitation_ai_reviews").insert({id:reviewId,owner_user_id:ownerId,submission_id:submission.id,model_name:GEMINI_MODEL,reference_text:referenceText,transcript_candidate:result.transcript_candidate,differences:result.differences,limitations:result.limitations});
  if(inserted.error)throw inserted.error;
  return json({ok:true,review_id:reviewId,result,disclaimer:result.limitations},200,headers||{});
 }catch(error){const code=String((error as Error)?.message||error||"SERVER_ERROR"),status=code==="TEACHER_AUTH_REQUIRED"||code==="TEACHER_AUTH_INVALID"?401:code==="TEACHER_NOT_ACTIVE"?403:code==="SUBMISSION_NOT_AVAILABLE"?404:code==="AI_DAILY_LIMIT"||code==="AI_RATE_LIMITED"?429:code==="AI_NOT_CONFIGURED"||code==="AI_PROVIDER_UNAVAILABLE"?503:400;return json({ok:false,error:code,message:code==="AI_NOT_CONFIGURED"?"خدمة التحليل غير مفعلة بعد.":code},status,headers||{});}
}
Deno.serve(handle);
