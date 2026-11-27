import assert from 'node:assert/strict';
import {selectAuthorizedAudio} from '../research/recitation-ai/security/select-audio.mjs';
function checks(select,assert){
 const r='10000000-0000-4000-8000-000000000001',c='10000000-0000-4000-8000-000000000002';
 const list={recordings:[{id:r,status:'submitted',object_path:'parent/abc/xyz.webm',comments:[{id:c,audio_path:'teacher/abc/xyz.ogg'}]}]};
 let n=0;const check=(x,m)=>{assert(x,m);n++;};
 check(select(list,{recordingId:r})==='parent/abc/xyz.webm','recording allowed');
 check(select(list,{recordingId:r,commentId:c})==='teacher/abc/xyz.ogg','comment allowed');
 check(select(list,{recordingId:c})===null,'foreign recording');
 check(select(list,{recordingId:r,commentId:r})===null,'foreign comment');
 check(select(list,{recordingId:r,path:'evil'})==='parent/abc/xyz.webm','caller path ignored');
 check(select({recordings:[]},{recordingId:r})===null,'empty authorization');
 check(select({recordings:[{...list.recordings[0],status:'pending'}]},{recordingId:r})===null,'pending');
 check(select({recordings:[{...list.recordings[0],object_path:'../a.webm'}]},{recordingId:r})===null,'traversal');
 check(select({recordings:[{...list.recordings[0],object_path:'https://other/a.webm'}]},{recordingId:r})===null,'remote path');
 check(select({recordings:[list.recordings[0],list.recordings[0]]},{recordingId:r})===null,'ambiguous id');
 check(select(null,{recordingId:r})===null,'missing list');
 return n;
}
console.log('PASS',checks(selectAuthorizedAudio,assert),'audio authorization selection checks');
