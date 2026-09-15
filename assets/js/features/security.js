import {state,saveSettings} from '../core/store.js';
import {$,toast,escapeHtml} from '../core/utils.js';

const enc=new TextEncoder();
export async function hashPin(pin){const buf=await crypto.subtle.digest('SHA-256',enc.encode(String(pin)));return [...new Uint8Array(buf)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function b64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function fromB64url(s){const x=s.replace(/-/g,'+').replace(/_/g,'/');const bin=atob(x+'='.repeat((4-x.length%4)%4));return Uint8Array.from(bin,c=>c.charCodeAt(0))}
export async function registerDeviceCredential(){
  if(!window.PublicKeyCredential||!navigator.credentials)throw new Error('البصمة/Windows Hello غير مدعوم هنا');
  const challenge=crypto.getRandomValues(new Uint8Array(32)),userId=crypto.getRandomValues(new Uint8Array(16));
  const cred=await navigator.credentials.create({publicKey:{challenge,rp:{name:'أكاديمية الإمام'},user:{id:userId,name:'imam-academy-local',displayName:'أكاديمية الإمام'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{userVerification:'preferred'},timeout:60000,attestation:'none'}});
  if(!cred)throw new Error('لم يتم إنشاء وسيلة الدخول');await saveSettings({webauthnCredentialId:b64url(new Uint8Array(cred.rawId))});return true;
}
export async function verifyDeviceCredential(){
  if(!state.settings.webauthnCredentialId||!window.PublicKeyCredential)return false;
  try{const cred=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:fromB64url(state.settings.webauthnCredentialId)}],userVerification:'preferred',timeout:60000}});return !!cred}catch{return false}
}
export async function ensureUnlocked(){
  if(!state.settings.pinHash)return true;const root=$('#modalRoot');return new Promise(resolve=>{
    root.innerHTML=`<div class="lock-screen"><section class="lock-card"><img src="assets/icons/icon-192.png" alt="" width="78" height="78"><h1>أكاديمية الإمام</h1><p>أدخل رمز PIN لفتح بيانات الأكاديمية.</p><input class="input lock-pin" id="lockPin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="رمز PIN"><button class="btn btn-primary btn-block" id="unlockPin">فتح التطبيق</button>${state.settings.webauthnCredentialId?'<button class="btn btn-secondary btn-block" id="unlockDevice">البصمة / Windows Hello</button>':''}<div class="lock-error" id="lockError"></div></section></div>`;
    const finish=()=>{root.innerHTML='';resolve(true)},check=async()=>{const val=$('#lockPin').value;if(await hashPin(val)===state.settings.pinHash)finish();else{$('#lockError').textContent='رمز PIN غير صحيح';$('#lockPin').select()}};
    $('#unlockPin').onclick=check;$('#lockPin').onkeydown=e=>{if(e.key==='Enter')check()};$('#unlockDevice')?.addEventListener('click',async()=>{if(await verifyDeviceCredential())finish();else toast('لم تنجح المصادقة على هذا الجهاز','error')});setTimeout(()=>$('#lockPin')?.focus(),50);
  })
}
export async function setPin(pin){if(!/^\d{4,8}$/.test(pin))throw new Error('استخدم 4 إلى 8 أرقام');await saveSettings({pinHash:await hashPin(pin)});return true}
export async function clearPin(){await saveSettings({pinHash:'',webauthnCredentialId:''})}
