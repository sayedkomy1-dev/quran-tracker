export const $=(sel,root=document)=>root.querySelector(sel);
export const $$=(sel,root=document)=>[...root.querySelectorAll(sel)];
export const uid=(prefix='id')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
export const todayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const fmtDate=(value)=>{if(!value)return'';const d=new Date(value.length===10?`${value}T12:00:00`:value);return new Intl.DateTimeFormat('ar-EG',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d)};
export const fmtTime=(value)=>value?new Intl.DateTimeFormat('ar-EG',{hour:'numeric',minute:'2-digit'}).format(new Date(value)):'';
export const escapeHtml=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const debounce=(fn,wait=250)=>{let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),wait)}};
export const bytes=(n=0)=>{if(!Number.isFinite(n))return'—';const u=['B','KB','MB','GB'];let i=0,v=n;while(v>=1024&&i<u.length-1){v/=1024;i++}return `${v>=10||i===0?v.toFixed(0):v.toFixed(1)} ${u[i]}`};
export const deepClone=(v)=>typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));
export function toast(message,type=''){const root=$('#toastRoot');if(!root)return;const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;root.append(el);setTimeout(()=>el.remove(),3600)}
export function modal({title='',body='',wide=false,onMount}={}){const root=$('#modalRoot');root.innerHTML=`<div class="modal-backdrop" data-modal-backdrop><section class="modal ${wide?'modal--wide':''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><header class="modal__head"><div class="modal__title">${escapeHtml(title)}</div><button class="icon-btn" data-close-modal aria-label="إغلاق">×</button></header><div class="modal__body">${body}</div></section></div>`;const esc=e=>{if(e.key==='Escape')close()};const close=()=>{document.removeEventListener('keydown',esc);root.innerHTML='';document.body.style.overflow=''};document.body.style.overflow='hidden';$('[data-close-modal]',root)?.addEventListener('click',close);$('[data-modal-backdrop]',root)?.addEventListener('click',e=>{if(e.target===e.currentTarget)close()});document.addEventListener('keydown',esc);onMount?.(root,close);return close}
const PATHS={
 home:'<path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5z"/>',
 students:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 session:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
 attendance:'<path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="m8 16 2 2 5-5"/>',
 reports:'<path d="M3 3v18h18"/><path d="m7 16 4-4 3 3 5-7"/>',
 mushaf:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 add:'<path d="M12 5v14M5 12h14"/>',
 search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
 edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4z"/>',
 whatsapp:'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>',
 book:'<path d="M2 4h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
 settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2.83 2.83-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21h-4v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2.83-2.83.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3v-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06 2.83-2.83.06.06A1.65 1.65 0 0 0 8.92 4a1.65 1.65 0 0 0 1-1.51V2h4v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2.83 2.83-.06.06A1.65 1.65 0 0 0 19.4 9c.12.37.18.76.18 1.15 0 .39-.06.78-.18 1.15z"/>'
};
export function icon(name,size=20){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]||PATHS.more}</svg>`}
export function downloadJson(data,filename='backup.json'){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
