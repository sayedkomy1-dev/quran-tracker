# تقرير التشغيل والمراجعة — أكاديمية الإمام v10.1.0

تاريخ المراجعة: 15 سبتمبر 2026

## 1) طريقة الاختبار

تم تشغيل الواجهة والـJavaScript الفعليين للمشروع داخل Chromium Headless بمقاسي هاتف `390×844` وسطح مكتب `1366×900`، مع تحميل ملفات:

- `index.html`
- `styles.css`
- `v9.css`
- `v10.css`
- `app.js`
- `v8.js`
- `v9.js`
- `v10.js`

بيئة التشغيل الحالية تمنع Chromium من فتح `localhost/file://` كتنقل شبكي عادي، لذلك تم حقن نفس HTML/CSS/JS داخل صفحة Chromium واختبار الـDOM والتفاعلات الفعلية. نتيجة لذلك:

- تم اختبار الواجهة والمنطق والتفاعلات في متصفح حقيقي.
- تم فحص Manifest/Service Worker/PWA ساكنًا.
- لم يُختبر تثبيت Android PWA الفعلي أو Service Worker عبر HTTP/HTTPS في هذه البيئة.
- لم يُحاكَ انقطاع شبكة حقيقي مع IndexedDB عبر origin فعلي؛ لذلك Offline persistence يحتاج QA على Chrome/Android حقيقي قبل Production.

## 2) نتيجة الاختبار المختصرة

| الاختبار | النتيجة |
|---|---|
| تحميل JS/CSS بدون أخطاء runtime | PASS |
| الصفحة الرئيسية — هاتف | PASS |
| الصفحة الرئيسية — Desktop | PASS |
| عدم وجود Horizontal overflow على Desktop | PASS |
| التنقل بين الصفحات الأساسية | PASS |
| Facebook setting | PASS |
| Themes A/B/C/D | PASS بعد إصلاح |
| فتح/غلق أقسام الرئيسية | PASS بعد إصلاح |
| حفظ حالة أقسام الرئيسية بعد `renderHome()` | PASS |
| قائمة السور — فتح | PASS |
| قائمة السور — غلق بالسهم | PASS بعد إصلاح |
| قائمة السور — Touch/Pointer selection | PASS بعد إصلاح |
| قائمة السور — stale blur/reopen race | PASS بعد إصلاح |
| اختيار سورة من القائمة | PASS |
| مراجعة مجموعة `✓ ✓ ↺ ✓ — ✓ — ✓` | PASS |
| تقييم ضعيف وعدم التكرار التلقائي | PASS |
| «نفس التكليف» بعد الضغط فقط | PASS |
| جزء تبارك — نطاق السور | PASS بعد إصلاح |
| جزء عمّ — نطاق السور | PASS بعد إصلاح |
| Static test suite | PASS |

الأمر النهائي:

```text
Static checks passed for Imam Academy v10.1.0
```

ولم تظهر `pageerror` أو Console errors في تشغيل الاختبار النهائي.

---

# 3) الخصائص الموجودة فعليًا في المشروع

## الصفحة الرئيسية والتنقل

- واجهة v9.2 النظيفة هي الواجهة الفعلية للرئيسية.
- كارت الحصة التالية / بدء الحصة.
- ملخص اليوم: اليوم، تم، تبقى، غياب.
- اختصارات عمل.
- طلاب اليوم.
- بحث سريع.
- Bottom navigation.
- قائمة «المزيد» للوصول إلى الحضور، المهام، المصحف، المجموعات، الإعدادات، سلامة البيانات.

## الطلاب

- إضافة/تعديل/حذف طالب.
- حالات الطالب Active / Paused / Archived.
- إعادة تنشيط الطالب.
- تثبيت/Favorite للطلاب.
- المجموعات.
- الجداول والأوقات.
- خطط الطالب.
- إجراءات جماعية.
- ملف الطالب.
- Timeline.
- خريطة التقدم في المصحف.
- ملخص أخطاء التسميع.

## الحصة

- Guided mode وExpert mode.
- الحضور.
- الحفظ الجديد.
- المراجعة القريبة.
- المراجعة البعيدة.
- مراجعة الأجزاء.
- مراجعة مجموعة سور.
- تقييم مستقل للحفظ/القريب/البعيد.
- Item-level review للسور داخل مجموعات المراجعة.
- حالات `completed / repeat / not_heard`.
- سجل أخطاء التسميع.
- اقتراح المراجعة.
- Autosave/Draft.
- Actual Recitation.
- اتجاه الاستمرار.
- «نفس التكليف» عند الضعف بعد قرار المحفظ فقط.
- زر النص أثناء تسميع التكليف السابق.
- ملاحظات صوتية محلية حتى 30 ثانية.
- WhatsApp report.

## القرآن والمصحف والصوت

- نص عثماني QPC Hafs مع cache.
- فتح النص من الحصة.
- مصحف المدينة PDF محلي.
- 604 صفحات.
- حفظ آخر صفحة.
- علامات Bookmark.
- صفحة واحدة / صفحتان على Desktop.
- Fullscreen.
- تنزيل حزمة النص للعمل Offline.
- القارئ محمود خليل الحصري.
- القارئ مشاري راشد العفاسي.
- تشغيل الآيات وإيقافها.
- طبقة Audio الموجودة سابقًا محفوظة.

## التقارير والإدارة

- تقارير.
- تقرير PDF شهري.
- شهادة وطباعة/حفظ PDF.
- مهام.
- حضور جماعي.
- مقارنة.
- Backup export/import.
- Auto backups.
- Data health check.
- Optional encrypted sync.
- PIN محلي باستخدام PBKDF2.
- WebAuthn/Windows Hello عند دعم الجهاز وHTTPS.
- Undo في واجهات v9.
- Keyboard shortcuts.
- Demo mode.

## PWA / Offline

- Manifest مستقل.
- `short_name = أكاديمية الإمام`.
- `display = standalone`.
- 192×192 و512×512 وmaskable.
- Service Worker app shell cache.
- runtime same-origin cache محدود.
- IndexedDB + localStorage safety fallback.

## الحديث والأذكار

- Library UI.
- Filters.
- إضافة المحتوى لطالب.
- نسخ النص.
- حفظ assignment/history للطالب.
- إظهار حديث/دعاء الطالب في الملف وتسجيل `completed/repeat`.

لكن المحتوى الحالي **Starter فقط** وليس المكتبة النهائية المطلوبة؛ التفاصيل في «المشكلات المتبقية».

---

# 4) المشكلات التي اكتُشفت وتم إصلاحها في v10.1.0

## P0/P1 — قائمة السور

### المشكلة 1: إغلاق القائمة كان يعيد فتحها

السبب: الكود القديم كان يغلق القائمة ثم يعيد `focus()` للحقل، بينما `onfocus` يفتح القائمة مرة أخرى.

### المشكلة 2: حماية blur كانت تمنع الإغلاق الصريح

بعد الإصلاح الأول ظهر في Runtime test أن الضغط الثاني على السهم لا يغلق القائمة إذا ظل الحقل Focused.

الحل النهائي:

- الفصل بين `close بسبب blur` و`close صريح من المستخدم`.
- الضغط على السهم يستخدم force-close.
- stale blur لا يغلق قائمة فُتحت من جديد.
- اختيار العناصر أصبح `pointerdown` مناسبًا للمس والماوس.
- ARIA `combobox/listbox/expanded/controls`.
- القائمة تختار الفتح أعلى أو أسفل الحقل حسب مساحة الشاشة.
- لا تغطي Bottom Navigation قدر الإمكان.
- إغلاق القوائم الأخرى عند فتح قائمة جديدة.

نتيجة التشغيل النهائية:

- Open: PASS
- Close: PASS
- Reopen: PASS
- Touch select: PASS
- 114 سورة: PASS
- اختيار «النساء»: PASS

## P1 — أقسام الصفحة الرئيسية

تم جعل الأقسام المرئية الأساسية الأربعة قابلة للفتح والغلق:

1. الحصة التالية.
2. ملخص اليوم.
3. اختصارات العمل.
4. طلاب اليوم.

التنفيذ:

- `<details>/<summary>` Accessible.
- الحالة محفوظة في `settings.v10.homeSections`.
- لا تضيع بعد `renderHome()`.
- تعمل على Mobile وDesktop.
- Header/اسم الأكاديمية/التاريخ/البحث لم يُجعل Accordion لأنه ليس «سيكشن محتوى» بل هوية وتنقل.

## P1 — خريطة الأجزاء

تم اكتشاف أن `V10_JUZ_RANGES` كان يحتوي **31 نطاقًا بدل 30**، ما يؤدي إلى انزياح في Mapping الأجزاء المتأخرة.

تم تصحيحه إلى 30 نطاقًا.

اختبار فعلي:

- جزء تبارك → الملك … المرسلات = 11 سورة.
- جزء عمّ → النبأ … الناس = 37 سورة.

## P1 — Themes

كان Theme selector يحفظ Palette A/B/C/D، لكن الواجهة v9.2 الفعلية تعتمد متغيرات `--v9-*` منفصلة، لذلك معظم الشاشة المرئية لم تكن تتغير.

تم ربط Palette v10 بمتغيرات Shell الفعلية:

- `--v9-primary`
- `--v9-primary-2`
- `--v9-gold`
- `--v9-bg`

واختُبر Theme D فعليًا داخل Chromium.

## P1 — Migration بعد Backup/Cloud restore

كانت استعادة نسخة قديمة أثناء تشغيل التطبيق تمر على `migrateV8Data()` فقط.

تم ربط `v10Migrate()` بعد:

- Import backup.
- Restore auto backup.
- Pull cloud sync.

وبذلك تُرقى بيانات مراجعة الأجزاء/السور فورًا إلى item-level model بدل انتظار Restart لاحق.

## P2 — Facebook configuration

تم تعديل Migration حتى يضع الرابط الافتراضي فقط إذا لم يوجد الحقل أصلًا، وليس كلما كان فارغًا. بذلك يمكن للمستخدم حذف رابط Facebook عمدًا دون أن يعود تلقائيًا بعد إعادة التشغيل.

## P2 — Reference حديث

كان سجل البداية لحديث «من لا يرحم لا يرحم» يحتوي رقمًا ملتبسًا `6013/6018 بحسب الترقيم`، وهذا يخالف شرط «لا تخمين».

تم تصحيحه إلى:

- صحيح البخاري 6013.
- كتاب الأدب.
- الراوي: جرير بن عبد الله رضي الله عنه.

تم التحقق من المرجع خارجيًا قبل التعديل.

---

# 5) اختبارات السيناريو المنفذة

## Scenario — مراجعة 8 سور

Input:

```text
النبأ          ✓
النازعات       ✓
عبس            ↺
التكوير        ✓
الانفطار       —
المطففين       ✓
الانشقاق       —
البروج         ✓
```

Actual next suggestion:

```text
سورة عبس
سورة الانفطار
سورة الانشقاق
```

PASS.

## Scenario — «ضعيف»

قبل الضغط على زر نفس التكليف:

```text
current next assignment = empty
enabled = false
```

بعد الضغط:

```text
enabled = true
سورة المنافقون
```

PASS — لا يوجد Auto-repeat.

## Scenario — Home Accordion persistence

- أغلق «ملخص اليوم».
- نفّذ `renderHome()`.
- ظل مغلقًا.

PASS.

---

# 6) مشكلات/نواقص ما زالت موجودة ولم أخفها

## A — Architecture debt: تكرار دوال كثيرة

هذه أهم مشكلة صيانة حالية.

`app.js` يحتوي 296 function declaration، منها **41 اسم دالة مكرر**، وكثير منها مكرر مرتين أو ثلاثًا، مثل:

- `buildSesData`
- `captureDraft`
- `applyDraft`
- `loadPrevTask`
- `fillSurahSelects`
- `buildWAMsg`
- `onSesSt`
- `resetSession`

و`v9.js` يحتوي أيضًا نسخًا مكررة من:

- `renderV9Home`
- `renderV9Mushaf`
- `openOfficialMushafPortal`

النسخة الأخيرة من الدالة هي التي تكسب بسبب ترتيب تحميل JavaScript، وهذا يعمل حاليًا لكنه يرفع خطر Regression بشدة.

**التوصية:** Refactor تدريجي، وليس إعادة بناء. استخراج Modules منطقية مع Compatibility bridge واختبارات قبل حذف أي نسخة قديمة.

الأولوية: High بعد تثبيت الوظائف الحالية.

## B — دقة حدود الجزء داخل السورة

النموذج الحالي يجعل الجزء Collection من **السور التي يمر بها الجزء**، وهذا أصلح من تقييم الجزء كتلة واحدة، لكن توجد مشكلة دقيقة:

بعض الأجزاء تبدأ أو تنتهي **داخل سورة**. حاليًا item يحتوي `surahId/surahName` فقط، وزر النص في مراجعة الجزء يفتح السورة كاملة.

المطلوب في النسخة الأدق أن يحمل ReviewItem — عند الحاجة — حدود الآيات الفعلية:

```text
fromAyah
toAyah
```

على كل ReviewItem عند الحاجة، بحيث لا يتحول جزء يحتوي جزءًا من سورة إلى تكليف بالسورة كاملة.

**التوصية:** إضافة `fromAyah/toAyah` إلى Item-level review في Schema جديد قبل اعتبار منطق الأجزاء Production-complete.

## C — مكتبة الحديث غير مكتملة

الموجود فعليًا الآن: **4 أحاديث فقط**.

المطلوب في PROMPT: حوالي 200.

كذلك UI الحالي يوفر:

- إضافة لطالب.
- نسخ.

ولا يوفر بعد لكل بطاقة:

- `حفظته ✓`.
- `التالي`.

وربط التقييم موجود في ملف الطالب، لكنه ليس بعد Block واضحًا داخل «الحصة التالية» كما طلب الـPROMPT.

## D — مكتبة الأدعية غير مكتملة

الموجود فعليًا الآن: **4 عناصر فقط**.

المطلوب: حوالي 60.

لا ينبغي ملؤها حتى يتم استيراد corpus موثق ومراجعة المصدر/المرجع لكل عنصر.

## E — ترتيب عناصر Smart Review

يمكن إضافة/حذف عناصر الاقتراح، لكن لم أجد UI صريحًا ومستقرًا لإعادة ترتيب السور بالسحب أو أزرار أعلى/أسفل كما يطلب الـPROMPT.

## F — تنزيل المصحف داخل التطبيق

الحالي:

```text
تنزيل خارجي للـPDF
ثم Import إلى التطبيق
```

وهو Fallback صريح وآمن.

غير الموجود بعد:

- streaming progress داخلي حقيقي.
- Pause.
- Resume باستخدام HTTP Range.
- Cancel لتحميل داخلي.

لا يجوز وصف التنزيل الخارجي بأنه Download manager داخلي.

## G — Bottom navigation والـPROMPT متعارضان

الواجهة الحالية:

```text
الرئيسية
الطلاب
الحصة
التقارير
المزيد
```

لكن الـPROMPT يقول:

```text
طلاب
الحضور
المصحف
المزيد
فقط
```

المشكلة: الصيغة الثانية لا تحتوي زر «الرئيسية» أصلًا، ولا تشرح كيف يعود المستخدم إليها.

يجب حسم ذلك في المواصفات قبل تغيير Navigation.

اقتراح UX:

```text
الرئيسية | الطلاب | الحضور | المصحف | المزيد
```

وتكون «ابدأ حصة» CTA داخل الرئيسية وملف الطالب، بدل Tab مستقل للحصة إن أردت الالتزام بفلسفة الصفحة البسيطة.

## H — Legacy home code ما زال موجودًا

الواجهة المرئية الحالية لا تعرض Charts/AI Insights القديمة، وهذا جيد، لكن بعض الكود/DOM القديم ما زال موجودًا ومخفيًا.

ليس Bug للمستخدم، لكنه Technical debt يجب تنظيفه بعد Regression tests.

## I — PWA/Offline يحتاج Real-device QA

Manifest وService Worker اجتازا الفحص الساكن، لكن هذه البيئة لا تسمح باختبار:

- Install prompt الفعلي على Android.
- Service Worker lifecycle عبر HTTPS.
- kill/reopen أثناء Session draft.
- قطع الإنترنت الحقيقي ثم عودته.
- تخزين PDF ~220MB على جهاز فعلي.

هذه الاختبارات يجب أن تكون Release Gate قبل Production.

---

# 7) مراجعة الـPROMPT الحالي

الـPROMPT قوي من ناحية الرؤية والـUX وقواعد المحتوى الشرعي، لكنه يحتاج تحويل بعض العبارات من «رغبات» إلى Requirements قابلة للاختبار.

أهم التعديلات المطلوبة:

1. تحديد Architecture الواقعية: Vanilla JS حاليًا، وعدم إجبار المطور على مصطلحات React مثل Error Boundaries.
2. إضافة Requirement صريح لقوائم السور Combobox على Touch/Keyboard/Blur/Outside click.
3. إضافة Requirement صريح لكل Sections الرئيسية لتكون Collapsible مع persisted state.
4. تعريف `fromAyah/toAyah` لمراجعة الأجزاء التي تبدأ/تنتهي وسط سورة.
5. تعريف معنى «الاستكمال الطبيعي» بدقة.
6. تحديد سلوك السورة الكاملة عند الاستكمال.
7. تحديد سياسة duplicate surahs إذا جاءت من أكثر من review group.
8. تعريف reorder UX صراحة.
9. فصل `ReviewAssignment` عن `ReviewOutcome` بدل استخدام status على الكيان نفسه بلا تاريخ.
10. تعريف Release migration بعد import/restore/sync، وليس startup فقط.
11. توضيح أن Pause/Resume للمصحف لا يعتبر متحققًا إلا إذا كان HTTP Range/streaming مدعومًا فعليًا.
12. حسم Bottom navigation المتناقض.
13. جعل 200 حديث و60 ذكر Acceptance Gate أو Milestone مستقلًا، وليس عبارة «حوالي» فقط.
14. إضافة Source URL/edition/sourceId لكل محتوى شرعي حيث أمكن.
15. اشتراط Browser runtime tests + Static tests + Android PWA checklist.
16. اشتراط Version bump/CHANGELOG/checksum عند كل Release.
17. إضافة Test صريح للاستيراد من Backup قديم ثم Migration داخل نفس التشغيل.
18. إضافة Test صريح لعدم فقد Accordion/Home states بعد rerender/reload.
19. منع إضافة طبقة Patch جديدة قبل فحص duplicate functions الحالية.
20. إضافة Definition of Done يفرق بين: Implemented / Partially Implemented / Not Testable in Environment.

تم إعداد نسخة PROMPT مراجعة ومستقلة في الملف `PROMPT-V2-AUDITED.md`.

---

# 8) ترتيب العمل المقترح بعد v10.1

1. تثبيت v10.1 الحالي واختباره على Android/Chrome حقيقي.
2. Refactor محدود للدوال المتكررة بدون تغيير UX.
3. Schema جديد لحدود الأجزاء `fromAyah/toAyah`.
4. استكمال Review reorder.
5. دمج حديث/دعاء الأسبوع داخل Session flow نفسه.
6. استيراد 200 حديث و60 ذكر من Corpus موثق مع Validator.
7. حسم Bottom navigation.
8. دراسة Download manager للمصحف فقط إذا المصدر يدعم CORS + Range؛ وإلا تثبيت Fallback الحالي كحل رسمي.

