const fs=require('fs');
const src=fs.readFileSync('js/features/teacher-error-marking.js','utf8');
function ok(cond,msg){if(!cond)throw new Error(msg);}
ok(src.includes("legacy.override('saveAndSendWA',function()"),'Save & Send override must be synchronous/direct');
ok(src.includes('safeOpenWhatsApp(st,msg);'),'Save & Send must call direct WhatsApp handoff');
const block=src.slice(src.indexOf("legacy.override('saveAndSendWA'"),src.indexOf("if(typeof g.saveAndSendWAMode"));
ok(!block.includes('shareErrorSnapshot('),'Save & Send must not invoke image share sheet');
ok(src.includes("$('qmarkShareImage').addEventListener('click',shareCurrentDraftImage)"),'Explicit image-share button must remain available');
console.log('PASS error-marking-stage1.3-whatsapp-check');
