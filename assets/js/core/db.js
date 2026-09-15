const DB_NAME='ImamAcademyV10';
const DB_VERSION=2;
const STORES=['students','sessions','tasks','settings','quran','files','backups','library','libraryProgress','meta'];
let dbPromise;
function openDb(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;for(const name of STORES){if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:'id'})}};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}
export async function getAll(store){const db=await openDb();return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly');const r=tx.objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
export async function getOne(store,id){const db=await openDb();return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly');const r=tx.objectStore(store).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
export async function put(store,value){const db=await openDb();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>res(value);tx.onerror=()=>rej(tx.error)})}
export async function bulkPut(store,values=[]){const db=await openDb();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');const os=tx.objectStore(store);for(const v of values)os.put(v);tx.oncomplete=()=>res(values);tx.onerror=()=>rej(tx.error)})}
export async function remove(store,id){const db=await openDb();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
export async function clearStore(store){const db=await openDb();return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).clear();tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})}
export async function kvGet(id,store='meta'){return getOne(store,id)}
export async function kvSet(id,value,store='meta'){return put(store,{id,value,updatedAt:new Date().toISOString()})}
export async function exportDb(){const out={version:10,exportedAt:new Date().toISOString(),stores:{}};for(const s of STORES.filter(x=>!['files','backups'].includes(x)))out.stores[s]=await getAll(s);return out}
export async function importDb(payload){if(!payload?.stores)throw new Error('ملف النسخة الاحتياطية غير صالح');for(const [s,rows] of Object.entries(payload.stores)){if(!STORES.includes(s)||!Array.isArray(rows))continue;await clearStore(s);await bulkPut(s,rows)}return true}
export {STORES};
