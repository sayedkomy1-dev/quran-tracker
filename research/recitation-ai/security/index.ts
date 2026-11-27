// STAGING ONLY. Deploy with verify_jwt=false only after testing guardian session RPC.
// Guardian login uses its own expiring UUID, not a Supabase Auth JWT.
import {selectAuthorizedAudio} from "./select-audio.mjs";
const required=(name:string)=>{const v=Deno.env.get(name);if(!v)throw new Error("Configuration unavailable");return v;};
const uuid=(x:unknown)=>typeof x==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
Deno.serve(async(req:Request)=>{
 const allowed=Deno.env.get("IMAM_GUARDIAN_ORIGIN"),origin=req.headers.get("origin");
 const headers={"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin",...(allowed&&origin===allowed?{"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Headers":"content-type,apikey,authorization,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"}:{})};
 const respond=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers});
 if(!allowed||origin!==allowed)return respond(403,{error:"not_authorized"});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return respond(405,{error:"method_not_allowed"});
 try{
  // Bounded streaming read to avoid trusting Content-Length.
  if(!req.body)return respond(400,{error:"invalid_request"});
  const reader=req.body.getReader();let total=0;const chunks:Uint8Array[]=[];
  try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>4096){await reader.cancel();return respond(413,{error:"invalid_request"});}chunks.push(value);}}finally{reader.releaseLock();}
  const raw=new Uint8Array(total);let off=0;for(const x of chunks){raw.set(x,off);off+=x.length;}
  let body;try{body=JSON.parse(new TextDecoder().decode(raw));}catch{return respond(400,{error:"invalid_request"});}
  if(!uuid(body?.sessionToken)||typeof body.studentRef!=="string"||!(/^[0-9a-f]{64}$/).test(body.studentRef)||!uuid(body.recordingId)||(body.commentId!=null&&!uuid(body.commentId)))return respond(400,{error:"invalid_request"});
  const base=required("SUPABASE_URL"),anon=required("SUPABASE_ANON_KEY");
  const auth=await fetch(base+"/rest/v1/rpc/guardian_home_recitation_session_list",{method:"POST",headers:{apikey:anon,Authorization:"Bearer "+anon,"Content-Type":"application/json"},body:JSON.stringify({p_session:body.sessionToken,p_student_ref:body.studentRef}),signal:AbortSignal.timeout(8000),redirect:"error"});
  if(!auth.ok)return respond(403,{error:"not_authorized"});
  const path=selectAuthorizedAudio(await auth.json(),body);
  if(!path)return respond(403,{error:"not_authorized"});
  const key=required("SUPABASE_SERVICE_ROLE_KEY");
  const signed=await fetch(base+"/storage/v1/object/sign/guardian-recitation-media/"+path.split("/").map(encodeURIComponent).join("/"),{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:60}),signal:AbortSignal.timeout(8000),redirect:"error"});
  if(!signed.ok)return respond(503,{error:"media_unavailable"});
  const j=await signed.json(),relative=j?.signedURL;
  if(typeof relative!=="string"||!relative.startsWith("/object/sign/guardian-recitation-media/"))return respond(503,{error:"media_unavailable"});
  return respond(200,{url:base+"/storage/v1"+relative,expiresIn:60});
 }catch{return respond(503,{error:"media_unavailable"});}
});
