'use strict';
/* Visual refresh contract: checks code wiring, not a substitute for mobile QA. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const home=read('js/features/role-home.js'),styles=read('role-home.css'),base=read('css/platform/components.css'),responsive=read('css/platform/responsive.css'),html=read('index.html'),sw=read('sw.js'),board=read('js/features/imam-smart-board.js');
assert(home.includes("role-hero-eyebrow")&&home.includes("role-hero-board")&&home.includes("role-actions-heading"),'semantic refreshed workspace markup required');
assert(home.includes('btn.dataset.destination=code'),'role shortcuts must retain route metadata');
assert(home.includes("btn.addEventListener('click',()=>trigger(code))"),'old route actions must retain handlers');
assert(home.includes("g.ImamApp.SmartBoard.open()")&&board.includes('assertUser();'),'board shortcut uses existing permission enforcement');
assert(styles.includes('.role-home-head { background:radial-gradient')&&styles.includes('.role-home-actions { display:grid'),'role dashboard must have redesigned hero and quick actions');
assert(styles.includes('#pg-home.v92-home-ready:not(.on){display:none!important}'),'non-active home must remain hidden');
assert(styles.includes('@media(max-width:480px)')&&responsive.includes('#pg-home .v92-stats{grid-template-columns:repeat(2'),'mobile 2-column layout required');
assert(base.includes('background:linear-gradient(110deg,#0a3934,#0c4b41)')&&base.includes('background:linear-gradient(115deg,#0d3936,#123e39)'),'header and dock must show visible redesign');
assert(html.includes('role-home.css?v=11.12.1-beta.17')&&sw.includes("'./role-home.css?v=11.12.1-beta.17'"),'role home stylesheet needs cache bust in online and offline shells');
assert(read('VERSION').trim()==='11.12.1-beta.17','version mismatch');
assert(!/<link\s[^>]*href="(?:styles|v9|v10|v11)\.css/.test(html),'legacy edition layers should not be loaded');
console.log('PASS beta8 visible homepage refresh: roles, existing destinations, board permission check, 2-column phone layout, dark header/dock, PWA cache');
