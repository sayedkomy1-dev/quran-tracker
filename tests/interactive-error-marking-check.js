const fs=require('fs');
const read=f=>fs.readFileSync(f,'utf8');
function ok(v,m){if(!v)throw new Error(m)}
const html=read('index.html'), js=read('js/features/teacher-error-marking.js'), css=read('teacher-error-marking.css'), v8=read('v8.js'), sw=read('sw.js');
ok(html.includes('teacher-error-marking.css?v=11.8.0'),'error marking CSS missing');
ok(html.includes('teacher-error-marking.js?v=11.12.1-beta.27-quran-picker-hotfix2'),'error marking JS missing');
for(const x of ['الحفظ الجديد — قراءة الطالب','التلقين — ترديد خلف الشيخ','التسميع','المراجعة'])ok(js.includes(x),'missing context '+x);
for(const x of ['تشكيل','نطق حرف','حذف حرف','زيادة حرف','كلمة خاطئة','مد','غنة','إخفاء','إدغام','إقلاب','قلقلة','وقف/ابتداء'])ok(js.includes(x),'missing error type '+x);
ok(js.includes("source:'quran-word'")&&js.includes('wordIndex')&&js.includes('resolved:false'),'structured word error record missing');
ok(js.includes('✓ تم التصحيح')&&js.includes('toggleResolved'),'resolved workflow missing');
ok(v8.includes('v8NormalizeErrorRecord')&&v8.includes("x.source==='quran-word'")&&v8.includes('resolvedAt'),'v8 structured error persistence missing');
ok(css.includes('.qmark-word.qmark-pronunciation')&&css.includes('.qmark-word.qmark-tajweed')&&css.includes('.qmark-word.qmark-resolved'),'word marker visual states missing');
ok(sw.includes("'./teacher-error-marking.css?v=11.8.0'")&&sw.includes("'./js/features/teacher-error-marking.js?v=11.12.1-beta.27-quran-picker-hotfix2'"),'offline shell missing error marking assets');
console.log('Interactive error marking checks passed');
