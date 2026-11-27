/* Staged guardian client adapter. Not loaded by the production portal. */
export async function fetchAuthorizedRecording({supabaseUrl,publishableKey,sessionToken,studentRef,recordingId,commentId=null,signal},fetcher=fetch){
 const root=new URL(supabaseUrl);
 if(root.protocol!=='https:'||root.username||root.password||root.pathname!=='/'||root.search||root.hash)throw Error('invalid storage origin');
 const validUuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
 if(!validUuid(sessionToken)||!validUuid(recordingId)||(commentId!==null&&!validUuid(commentId))||!(/^[0-9a-f]{64}$/).test(studentRef)||typeof publishableKey!=='string'||!publishableKey)throw Error('invalid guardian context');
 const response=await fetcher(root.origin+'/functions/v1/guardian-recitation-media',{method:'POST',headers:{'Content-Type':'application/json',apikey:publishableKey},body:JSON.stringify({sessionToken,studentRef,recordingId,commentId}),cache:'no-store',redirect:'error',signal});
 if(!response.ok)throw Error('media authorization failed');
 const data=await response.json();
 if(typeof data?.url!=='string'||data.expiresIn!==60)throw Error('invalid media capability');
 const u=new URL(data.url);
 if(u.origin!==root.origin||!u.pathname.startsWith('/storage/v1/object/sign/guardian-recitation-media/')||!u.searchParams.get('token')||u.username||u.password||u.hash)throw Error('invalid signed media URL');
 const audio=await fetcher(u.href,{cache:'no-store',redirect:'error',signal});
 if(!audio.ok)throw Error('media unavailable');
 const mime=String(audio.headers.get('content-type')||'').split(';')[0];
 if(!['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav','application/ogg'].includes(mime))throw Error('unexpected media type');
 // Do not keep capability URLs or audio in persistent storage.
 if(!audio.body)throw Error('media stream unavailable');
 const reader=audio.body.getReader(),chunks=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>10*1024*1024){await reader.cancel();throw Error('media too large');}chunks.push(value);}}finally{reader.releaseLock();}
 if(!bytes)throw Error('empty media');
 return new Blob(chunks,{type:mime});
}
