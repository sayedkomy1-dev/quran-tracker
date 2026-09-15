import {toast} from './utils.js';
let installEvent=null;
export async function setupPwa(){
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;window.dispatchEvent(new CustomEvent('pwa-install-ready'))});
  window.addEventListener('appinstalled',()=>{installEvent=null;toast('تم تثبيت أكاديمية الإمام على الجهاز','success')});
  if(!new URLSearchParams(location.search).has('no-sw')&&'serviceWorker' in navigator){try{const reg=await navigator.serviceWorker.register('./sw.js');reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)toast('تم تنزيل تحديث جديد وسيعمل عند إعادة فتح التطبيق.','success')})})}catch(e){console.warn('SW',e)}}
  try{await navigator.storage?.persist?.()}catch{}
}
export function canInstallPwa(){return !!installEvent}
export async function installPwa(){if(!installEvent)return false;installEvent.prompt();const choice=await installEvent.userChoice;installEvent=null;return choice?.outcome==='accepted'}
export function isStandalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
