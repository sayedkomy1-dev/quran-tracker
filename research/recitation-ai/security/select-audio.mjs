/* Independent selector for server-authorized recording list. */
function selectAuthorizedAudio(list,request){
 const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
 if(!request||!uuid(request.recordingId)||(request.commentId!=null&&!uuid(request.commentId))||!Array.isArray(list?.recordings))return null;
 const rows=list.recordings.filter(r=>r?.id===request.recordingId);
 if(rows.length!==1||!['submitted','reviewed','needs_retry'].includes(rows[0].status))return null;
 const r=rows[0];let path=r.object_path;
 if(request.commentId!=null){
  const comments=Array.isArray(r.comments)?r.comments.filter(c=>c?.id===request.commentId):[];
  if(comments.length!==1)return null;
  path=comments[0].audio_path;
 }
 // Canonical opaque paths only; never accept a path, bucket, or URL supplied by the client.
 if(typeof path!=='string'||path.length>240||!path.split('/').every(x=>/^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9]+)?$/.test(x))||!/\.(webm|m4a|ogg|mp3|wav)$/i.test(path))return null;
 return path;
}
export {selectAuthorizedAudio};
