import {$$} from './utils.js';
const routes=new Map();let current='home';
export function register(name,render){routes.set(name,render)}
export function getRoute(){return current}
export function go(name,params={}){if(!routes.has(name))name='home';current=name;history.replaceState(null,'',`#${name}`);renderCurrent(params)}
export function renderCurrent(params={}){const fn=routes.get(current)||routes.get('home');fn?.(params);$$('[data-route]').forEach(b=>{const on=b.dataset.route===current;b.toggleAttribute('aria-current',on);if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});document.querySelector('#main')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'})}
export function startRouter(){const h=location.hash.replace('#','');current=routes.has(h)?h:'home';window.addEventListener('hashchange',()=>{const n=location.hash.replace('#','');if(routes.has(n)){current=n;renderCurrent()}});renderCurrent()}
