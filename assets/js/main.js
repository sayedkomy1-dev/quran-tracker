import {initStore,state} from './core/store.js';
import {register,startRouter,go,getRoute} from './core/router.js';
import {setupPwa} from './core/pwa.js';
import {icon,$,modal,escapeHtml} from './core/utils.js';
import {renderHome} from './features/home.js';
import {renderStudents} from './features/students.js';
import {renderAttendance} from './features/attendance.js';
import {renderSession} from './features/session.js';
import {renderReports} from './features/reports.js';
import {renderMushaf} from './features/mushaf.js';
import {renderLibrary} from './features/library.js';
import {renderSettings} from './features/settings.js';
import {renderMore} from './features/more.js';
import {renderTasks} from './features/tasks.js';
import {renderHealth} from './features/health.js';
import {renderGroups} from './features/groups.js';
import {ensureUnlocked} from './features/security.js';
import {maybeShowOnboarding} from './features/onboarding.js';
import {startSession} from './features/session.js';
import {openStudentProfile} from './features/profile.js';

const nav=[
  ['home','الرئيسية','home'],['students','الطلاب','students'],['attendance','الحضور','attendance'],['session','الحصة','session'],['reports','التقارير','reports'],['mushaf','المصحف','mushaf'],['library','الحديث والدعاء','book'],['groups','الحلقات','students'],['tasks','المهام','session'],['settings','الإعدادات','settings']
];
const mobile=[['home','الرئيسية','home'],['students','الطلاب','students'],['session','الحصة','session'],['reports','التقارير','reports'],['more','المزيد','more']];
function navHtml(items){return items.map(([route,label,ico])=>`<button class="nav-btn" data-route="${route}"><span class="nav-icon">${icon(ico,21)}</span><span>${label}</span></button>`).join('')}
function commandPalette(){
  const actions=[['home','الرئيسية'],['students','الطلاب'],['attendance','الحضور'],['session','بدء حصة'],['reports','التقارير'],['mushaf','المصحف'],['library','الحديث والدعاء'],['tasks','المهام'],['settings','الإعدادات']];
  modal({title:'بحث سريع',body:`<label class="field"><span class="label">اكتب اسم طالب أو صفحة</span><input class="input" id="commandSearch" autocomplete="off" placeholder="مثال: أحمد، المصحف، التقارير"></label><div class="list command-results" id="commandResults" style="margin-top:12px"></div>`,onMount:(root,close)=>{const q=$('#commandSearch',root),list=$('#commandResults',root);const paint=()=>{const term=q.value.trim();const rows=[...actions.map(([route,label])=>({type:'route',route,label})),...state.students.filter(s=>s.status!=='archived').map(s=>({type:'student',id:s.id,label:s.name,meta:s.group||'طالب'}))].filter(x=>!term||x.label.includes(term)||x.meta?.includes(term));list.innerHTML=rows.slice(0,12).map((x,i)=>`<button class="list-row" data-command-index="${i}" style="width:100%;text-align:right"><div class="list-row__main"><div class="list-row__title">${escapeHtml(x.label)}</div><div class="list-row__meta">${x.type==='route'?'انتقال سريع':escapeHtml(x.meta)}</div></div></button>`).join('');list.querySelectorAll('[data-command-index]').forEach(b=>b.onclick=()=>{const x=rows[Number(b.dataset.commandIndex)];close();if(x.type==='route')go(x.route);else openStudentProfile(x.id)})};q.oninput=paint;q.onkeydown=e=>{if(e.key==='Enter')list.querySelector('[data-command-index]')?.click()};paint();setTimeout(()=>q.focus(),30)}})
}
function setupKeyboard(){document.addEventListener('keydown',e=>{const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();commandPalette();return}if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&getRoute()==='session'){e.preventDefault();document.querySelector('#saveSession')?.click();return}if(!typing&&e.key==='/'){e.preventDefault();commandPalette();return}if(e.altKey&&['1','2','3','4','5'].includes(e.key)){e.preventDefault();go(['home','students','session','reports','more'][Number(e.key)-1])}})}
async function boot(){
  $('#desktopNav').innerHTML=navHtml(nav);$('#mobileNav').innerHTML=navHtml(mobile);document.addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(b)go(b.dataset.route)});
  register('home',renderHome);register('students',renderStudents);register('attendance',renderAttendance);register('session',renderSession);register('reports',renderReports);register('mushaf',renderMushaf);register('library',renderLibrary);register('groups',renderGroups);register('tasks',renderTasks);register('health',renderHealth);register('settings',renderSettings);register('more',renderMore);
  await initStore();document.documentElement.dataset.palette=state.settings.palette||'emerald';await setupPwa();await ensureUnlocked();startRouter();setupKeyboard();setTimeout(maybeShowOnboarding,300);
}
boot().catch(err=>{console.error(err);document.querySelector('#main').innerHTML=`<section class="page"><div class="empty"><strong>تعذر تشغيل التطبيق</strong><p>${escapeHtml(String(err.message||err))}</p></div></section>`});
