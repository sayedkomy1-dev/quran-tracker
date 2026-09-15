import * as db from './db.js';
import {uid,todayKey} from './utils.js';
const defaultSettings={
  id:'app',academyName:'أكاديمية الإمام لتحفيظ القرآن الكريم',tagline:'بالقرآن نحيا',facebookUrl:'',palette:'emerald',teacherName:'',
  repeatFromLastAyah:true,whatsappMode:'detailed',mushafUrl:'https://pdf.quran.ws/pdfs/hafs/quran-hafs-mushaf.pdf',
  hadithSourceUrl:'https://raw.githubusercontent.com/AhmedBaset/hadith-json/v1.2.0/db/by_book/the_9_books/bukhari.json',
  duaSourceUrl:'https://raw.githubusercontent.com/sehalhussain/Hadith-Dua-assets/main/duas-adhkar-hisnul-muslim.json',
  reciter:'husary',onboardingDone:false,pinHash:'',webauthnCredentialId:'',autoBackup:true
};
export const state={students:[],sessions:[],tasks:[],library:[],settings:{...defaultSettings},ready:false};
const listeners=new Set();
export function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
export function emit(){for(const fn of listeners)fn(state)}
export async function initStore(){
  state.students=await db.getAll('students');state.sessions=await db.getAll('sessions');state.tasks=await db.getAll('tasks');state.library=await db.getAll('library');
  const settings=await db.getOne('settings','app');if(settings)state.settings={...defaultSettings,...settings};else await db.put('settings',{...defaultSettings});
  if(!state.students.length)await migrateLegacy();
  state.ready=true;emit();return state;
}
async function migrateLegacy(){
  try{
    const keys=[['qt_st','qt_ses'],['qt_students','qt_sessions']];let oldStudents=[],oldSessions=[];
    for(const [sk,sek] of keys){const s=JSON.parse(localStorage.getItem(sk)||'[]');if(Array.isArray(s)&&s.length){oldStudents=s;oldSessions=JSON.parse(localStorage.getItem(sek)||'[]');break}}
    if(!oldStudents.length)return;
    const students=oldStudents.map(s=>({id:String(s.id||uid('st')),name:s.name||'طالب',phone:s.phone||s.whatsapp||'',group:s.group||s.groupName||'',status:s.status==='archived'?'archived':'active',favorite:!!s.favorite,scheduleDays:s.scheduleDays||[],scheduleTime:s.scheduleTime||'',plan:s.plan||'متوازن',directions:{new:'up',near:'up',far:'up',juz:'up',surahs:'up',...(s.directions||{})},createdAt:s.createdAt||new Date().toISOString()}));
    const sessions=(Array.isArray(oldSessions)?oldSessions:[]).map(x=>({id:String(x.id||uid('ses')),studentId:String(x.studentId||''),date:x.sessionDate||String(x.date||todayKey()).slice(0,10),status:x.status||'حضر',legacy:x,createdAt:x.createdAt||x.date||new Date().toISOString()}));
    await db.bulkPut('students',students);await db.bulkPut('sessions',sessions);state.students=students;state.sessions=sessions;
    await db.kvSet('legacyMigration',{done:true,at:new Date().toISOString()});
  }catch(e){console.warn('Legacy migration skipped',e)}
}
async function autoBackup(reason='change'){
  if(!state.settings.autoBackup)return;
  try{
    const snapshot=await db.exportDb();const id=`auto-${Date.now()}`;await db.put('backups',{id,type:'auto',reason,createdAt:new Date().toISOString(),snapshot});
    const rows=(await db.getAll('backups')).filter(x=>x.type==='auto').sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    for(const old of rows.slice(5))await db.remove('backups',old.id);
  }catch(e){console.warn('Automatic backup failed',e)}
}
export async function saveSettings(patch){state.settings={...state.settings,...patch,id:'app'};await db.put('settings',state.settings);document.documentElement.dataset.palette=state.settings.palette||'emerald';emit();await autoBackup('settings');return state.settings}
export async function addStudent(data){const row={id:uid('st'),status:'active',favorite:false,plan:'متوازن',scheduleDays:[],directions:{new:'up',near:'up',far:'up',juz:'up',surahs:'up'},createdAt:new Date().toISOString(),...data};state.students.push(row);await db.put('students',row);emit();await autoBackup('student-add');return row}
export async function updateStudent(id,patch){const i=state.students.findIndex(x=>x.id===id);if(i<0)return null;state.students[i]={...state.students[i],...patch,updatedAt:new Date().toISOString()};await db.put('students',state.students[i]);emit();await autoBackup('student-update');return state.students[i]}
export async function deleteStudent(id){state.students=state.students.filter(x=>x.id!==id);state.sessions=state.sessions.filter(x=>x.studentId!==id);state.tasks=state.tasks.filter(x=>x.studentId!==id);await db.remove('students',id);for(const s of await db.getAll('sessions'))if(s.studentId===id)await db.remove('sessions',s.id);for(const t of await db.getAll('tasks'))if(t.studentId===id)await db.remove('tasks',t.id);emit();await autoBackup('student-delete')}
export async function saveSession(row){const i=state.sessions.findIndex(x=>x.id===row.id);if(i>=0)state.sessions[i]=row;else state.sessions.push(row);await db.put('sessions',row);emit();await autoBackup('session');return row}
export async function setAttendance(studentId,date,status){let row=state.sessions.find(x=>x.studentId===studentId&&x.date===date);if(row){row={...row,status,updatedAt:new Date().toISOString()}}else row={id:uid('ses'),studentId,date,status,createdAt:new Date().toISOString(),attendanceOnly:true};return saveSession(row)}
export async function addTask(data){const row={id:uid('task'),title:'مهمة',priority:'normal',done:false,createdAt:new Date().toISOString(),...data};state.tasks.push(row);await db.put('tasks',row);emit();return row}
export async function updateTask(id,patch){const i=state.tasks.findIndex(x=>x.id===id);if(i<0)return;state.tasks[i]={...state.tasks[i],...patch,updatedAt:new Date().toISOString()};await db.put('tasks',state.tasks[i]);emit();return state.tasks[i]}
export async function deleteTask(id){state.tasks=state.tasks.filter(x=>x.id!==id);await db.remove('tasks',id);emit()}
export async function refreshLibrary(){state.library=await db.getAll('library');emit();return state.library}
export const studentById=id=>state.students.find(x=>x.id===id);
export const sessionsFor=id=>state.sessions.filter(x=>x.studentId===id).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
export const sessionForDay=(id,date)=>state.sessions.find(x=>x.studentId===id&&x.date===date);
export const activeStudents=()=>state.students.filter(x=>x.status==='active');
export {autoBackup};
