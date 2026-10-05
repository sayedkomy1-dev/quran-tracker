# Audit وتنفيذ v10 — أكاديمية الإمام

## Architecture الحالية
- Vanilla JavaScript PWA، بلا React/Vue.
- App shell: `index.html`, `styles.css`, `app.js`, ثم طبقتا الميزات `v8.js`, `v9.js`.
- Persistence: IndexedDB + localStorage safety copy، مع local-first وSupabase sync اختياري مشفر.
- Service Worker: app-shell cache + runtime same-origin cache.
- Session autosave/draft موجود مسبقًا.
- Quran: QPC Hafs text cache + EveryAyah audio + PDF Mushaf stored locally.

## الملفات المتأثرة
- `app.js`: رفع الإصدار إلى 10.0.0 وSchema 12.
- `v8.js`: الحفاظ على `reviewAssignments/reviewResults` في الاستيراد الآمن.
- `v9.js`: Schema 12 + hooks آمنة لملف الطالب والمصحف.
- `v10.js`: طبقة Data Model/Session Workflow الجديدة.
- `v10.css`: Clean UI + Palette/Accessibility.
- `index.html`: تحميل طبقة v10.
- `manifest.json`: Palette A للـPWA.
- `sw.js`: cache v10 مستقل وإضافة أصول v10.
- `tests/static-check.js`: اختبارات Schema/Review/PWA الجديدة.

## Data Model v10
`reviewAssignments[]` يحتفظ بالمجموعة وبداخلها `items[]`، وكل item يحتوي على `surahId/surahName/status/evaluation/errors/notes`.

الحالات:
- `completed`
- `repeat`
- `not_heard`

يستمر الاحتفاظ بـ `juz.chips` و`surahReview.chips` القديمة للتوافق الرجعي والتقارير القديمة.

## Migration
- أي حصة قديمة فيها `juz.chips` أو `surahReview.chips` تتحول عند التشغيل إلى `reviewAssignments` بدون حذف البيانات القديمة.
- جزء تبارك يتوسع إلى السور 67–77، وجزء عم إلى 78–114، وباقي الأجزاء يعتمد نطاق السور التي يمر بها الجزء.

## Session logic
- الحفظ الجديد/القريب/البعيد: تقييم مستقل كما كان، مع زر `📖 النص` داخل التسميع السابق.
- عند `ضعيف`: يظهر `↺ نفس التكليف للحصة القادمة` ولا يحدث نسخ تلقائي.
- مراجعة الأجزاء/السور: تقييم item-level: ✓ / ↺ / —.
- الاقتراح التالي يجمع فقط `repeat + not_heard`.
- الاقتراح لا يغير التكليف إلا عند الضغط على «إضافة السور غير المتقنة فقط».
- Accordion الأخطاء واقتراح المراجعة مغلقان افتراضيًا وتُحفظ حالتهما في draft.

## WhatsApp
- قالب افتراضي أكثر اختصارًا.
- Facebook URL أصبح Setting (`settings.facebookUrl`) وليس hard-coded في الرسالة.

## Themes
- A Emerald & Ivory افتراضي.
- B/C/D معرفة في architecture ويمكن اختيارها من Settings.

## PWA
- `short_name`: أكاديمية الإمام.
- `display: standalone` محفوظ.
- Palette A: theme/background updated.
- cache جديد `quran-pwa-v10.0.0` ويشمل `v10.js/v10.css`.

## الحديث والأذكار
- أضيفت Library UI + filters + assign-to-student + tracking history.
- لم يتم ملء 200 حديث/60 ذكر آليًا لأن هذا المحتوى يجب أن يأتي من corpus موثوق ومراجع؛ النسخة الحالية تحتوي seed موثق محدود فقط.
- المصدر المرشح للاستيراد الكامل: Hadith-Dua-assets (Sahih Bukhari/Muslim databases + Hisnul Muslim JSON). يلزم إدخال dataset الفعلي ثم مراجعة الحقول/الترقيم قبل production.

## المصحف Offline
- لم يُدَّع وجود pause/resume داخلي غير حقيقي.
- المسار الحالي موضح للمستخدم بصدق: تنزيل خارجي ثم Import PDF عند قيود CORS/server.
- التخزين المحلي/القارئ/النص Offline الموجودان مسبقًا محفوظان.

## الاختبارات المنفذة
`node tests/static-check.js` — PASS.

يغطي:
- syntax لكل JS layers.
- version/schema consistency.
- service-worker app shell.
- PWA identity.
- item-level review model markers.
- weak-grade explicit repeat action.
- Facebook setting.
- Theme architecture.
- regression guards القديمة للحفظ/الإرسال/المصحف/PIN/data health.

## نقاط تحتاج QA متصفح يدوي قبل Production
- تشغيل السيناريوهات العشرة على Chrome/Android PWA فعليًا.
- اختبار IndexedDB quota مع PDF ~220MB على الأجهزة المستهدفة.
- إدخال corpus الحديث/الأذكار الكامل من مصدر موثوق ومراجعة metadata قبل إطلاقه للمستخدمين.
