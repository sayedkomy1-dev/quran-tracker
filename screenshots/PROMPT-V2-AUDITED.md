# PROMPT v2 — تطوير «أكاديمية الإمام» بعد Runtime Audit

أنت تعمل كمطور **Senior Full-Stack + UI/UX + PWA Engineer** على مشروع قائم بالفعل باسم:

**أكاديمية الإمام لتحفيظ القرآن الكريم**

مهمتك هي التطوير **فوق الكود الحالي** دون إعادة بناء المشروع من الصفر، ودون حذف أي وظيفة قائمة إلا لسبب موثق ومختبر.

هذه النسخة من الـPROMPT مبنية على Runtime Audit للمشروع؛ لذلك هي أكثر صرامة في الـData Model، Migration، QA، Offline، وتفاعلات Mobile.

---

# 0. قواعد تنفيذ غير قابلة للتفاوض

1. ابدأ دائمًا بـAudit للكود الحالي قبل التعديل.
2. لا تفترض أن المشروع React/Firebase؛ افحص التقنية الفعلية واستخدم البنية الموجودة.
3. لا تضف طبقة Patch جديدة لمجرد سهولة التنفيذ إذا كان الخطأ ناتجًا عن duplicate/override موجود بالفعل.
4. قبل Override أي function، ابحث عن كل تعريفاتها وكل Call sites وترتيب تحميل الملفات.
5. لا تحذف بيانات قديمة.
6. كل Data Model change يجب أن يملك Migration قابلًا لإعادة التشغيل Idempotent.
7. Migration يجب أن يعمل عند:
   - Startup.
   - Backup import.
   - Auto-backup restore.
   - Cloud/sync restore إن وجد.
8. لا تضع بيانات طالب تجريبية في Production data.
9. Demo mode إن كان موجودًا يبقى صريحًا وقابلًا للحذف.
10. لا تولد أي حديث أو دعاء أو تخريج بالذكاء الاصطناعي.
11. لا تدّع نجاح Test لم تستطع تشغيله.
12. في التقرير النهائي صنّف كل بند: `Implemented / Partial / Not implemented / Not testable in environment`.

---

# 1. Baseline المطلوب فحصه

افحص على الأقل:

- HTML/app shell.
- CSS layers.
- JavaScript layers وfunction overrides.
- Pages/navigation.
- Session state.
- IndexedDB.
- localStorage fallback.
- Backup/import.
- Sync إن وجد.
- Service Worker.
- Manifest.
- Quran text cache.
- Mushaf PDF storage.
- Audio.
- Student/session/task models.
- WhatsApp generation.
- Settings.
- Accessibility/RTL.

أخرج قبل التعديل Map يوضح الملفات المسؤولة عن:

- Home.
- Students.
- Attendance.
- Session.
- Previous recitation.
- Assessments.
- Review groups.
- Smart Review.
- Quran text.
- Mushaf.
- Audio.
- Reports.
- WhatsApp.
- Backup/restore.
- PWA/Offline.

---

# 2. Architecture safety

المشروع الحالي يمكن أن يحتوي Legacy function overrides.

قبل إضافة أي function باسم موجود:

- ابحث عن جميع التعريفات.
- حدد أي تعريف هو Effective definition بعد ترتيب تحميل السكربتات.
- امنع recursion أو override غير مقصود.
- أضف Regression test.

إذا وجدت functions مكررة بكثرة، نفّذ Refactor تدريجيًا فقط بعد تثبيت السلوك الحالي بالاختبارات. لا تعيد البناء من الصفر.

---

# 3. فلسفة UX العامة

الواجهة:

- عربية RTL.
- هادئة.
- عملية.
- Mobile-first.
- المعلومات الأساسية أولًا.
- التفاصيل الثانوية عبر Progressive Disclosure.

ممنوع على الصفحة الرئيسية:

- Charts.
- AI Insights.
- Dashboard مزدحم.
- Cards لا يحتاجها المحفظ يوميًا.

الذكاء يكون في:

- حفظ البيانات.
- تتبع التسميع.
- اقتراح المراجعة.
- تقليل الإدخال اليدوي.

---

# 4. الصفحة الرئيسية — النسخة المعتمدة

يظهر:

```text
أكاديمية الإمام
التاريخ
بحث

الحصة التالية / ابدأ حصة

اليوم | تمت | تبقى | غياب

اختصارات العمل

طلاب اليوم
```

## شرط جديد إلزامي: Collapsible sections

كل **سيكشن محتوى** في الرئيسية يجب أن يملك زر فتح/غلق واضحًا، مع استثناء Header/اسم الأكاديمية/التاريخ/البحث وBottom navigation.

السيكشنات الحالية على الأقل:

- الحصة التالية.
- ملخص اليوم.
- اختصارات العمل.
- طلاب اليوم.

المطلوب:

- Accessible `details/summary` أو implementation مكافئ.
- Keyboard operable.
- `aria-expanded` إن لم تستخدم details native.
- Touch target مناسب.
- حفظ open/closed state في Settings.
- عدم فقد الحالة بعد `renderHome()`.
- عدم فقد الحالة عند navigation ذهابًا وعودة.
- Migration آمنة للحالة الافتراضية.

لا تجعل Header نفسه Collapsible.

---

# 5. حسم Bottom Navigation قبل التنفيذ

المواصفة القديمة كانت متناقضة لأنها حذفت «الرئيسية» من Bottom navigation.

النسخة المقترحة المعتمدة ما لم يقرر Product Owner خلاف ذلك:

```text
الرئيسية | الطلاب | الحضور | المصحف | المزيد
```

ويكون «ابدأ حصة» CTA داخل Home/Profile، وليس شرطًا Tab مستقلًا.

إذا قرر Product Owner الحفاظ على Tab «الحصة» أو «التقارير»، لا تغيره خلسة؛ وثق القرار أولًا.

---

# 6. Surah Combobox — Requirement صريح

كل اختيار سورة في:

- الحفظ الجديد.
- المراجعة القريبة.
- المراجعة البعيدة.
- أي مكان مشابه.

يجب أن يعمل كـAccessible searchable combobox.

## السلوك المطلوب

- الضغط على الحقل يفتح القائمة.
- زر السهم يفتحها إذا كانت مغلقة.
- زر السهم يغلقها إذا كانت مفتوحة **حتى لو كان input ما زال focused**.
- الكتابة تصفي النتائج.
- اختيار النتيجة يعمل باللمس والماوس.
- Enter/Keyboard مدعوم قدر الإمكان.
- Escape يغلق.
- Click outside يغلق.
- Blur لا يغلق قائمة أعيد فتحها بسبب stale timeout.
- فتح قائمة يغلق أي Surah list أخرى.
- القائمة تفتح لأعلى إذا لم توجد مساحة كافية أسفلها.
- لا تختفي تحت Bottom nav.
- لا يتكرر فتحها فورًا بعد الإغلاق بسبب `focus()`.

## Accessibility

- `role=combobox`.
- `aria-controls`.
- `aria-expanded`.
- list `role=listbox`.
- options قابلة للوصول.

اختبرها على viewport هاتف حقيقي/محاكى.

---

# 7. Accordion داخل الحصة

اجعل:

- سجل أخطاء التسميع.
- اقتراح المراجعة.

مغلقين افتراضيًا.

يجب حفظ حالتهما داخل Session draft وعدم فقدها عند rerender.

نفس Progressive Disclosure ينطبق على البيانات الثانوية.

---

# 8. تسميع الحصة السابقة

الأنواع:

- الحفظ الجديد.
- المراجعة القريبة.
- المراجعة البعيدة.

كل نوع له تقييم مستقل:

- ممتاز.
- جيد جدًا.
- جيد.
- ضعيف.

## ضعيف

يظهر:

```text
↺ نفس التكليف للحصة القادمة
```

ولا ينسخ النظام التكليف تلقائيًا.

قبل الضغط يجب أن يظل Next assignment دون تغيير.

بعد الضغط فقط يتم نسخ التكليف، ويبقى قابلًا للتعديل.

## الاستكمال الطبيعي

لا تستخدم عبارة «الاستكمال الطبيعي» دون Algorithm.

عرّفه كالآتي:

- إذا كان Assignment range داخل سورة: يبدأ المقترح من `previous.to + 1`.
- لا يتجاوز عدد آيات السورة.
- إذا انتهت السورة، اتبع Direction setting الحالي إذا كان معرفًا.
- إذا كان Assignment = full surah، لا تختر Next surah إلا وفق direction/plan الموجودين بالفعل.
- Smart Continue اقتراح فقط ولا يحفظ دون موافقة المحفظ.

---

# 9. زر النص أثناء التسميع

بجوار كل Assignment سابق:

```text
📖 النص
```

يفتح النص دون مغادرة Session state.

داخل العرض:

```text
النص | صفحة المصحف
```

مع الحفاظ على Audio/reciter/repetition/talqin/speed إن كانت موجودة.

في Review items أيضًا يوجد زر نص للسورة/النطاق الحالي.

---

# 10. Review Data Model — فصل Assignment عن Outcome

استخدم نموذجًا واضحًا مثل:

```text
ReviewAssignment
  id
  type
  groupId
  groupName
  order
  items[]

ReviewItem
  id
  type
  surahId
  surahName
  fromAyah?      // مهم للأجزاء التي تبدأ وسط سورة
  toAyah?        // مهم للأجزاء التي تنتهي وسط سورة
  sourceJuzId?
  order

ReviewOutcome
  assignmentId
  itemId
  status         // completed | repeat | not_heard
  evaluation?
  errors[]
  notes
  evaluatedAt
```

لا تجعل status الدائم جزءًا ملتبسًا من الـAssignment المخطط؛ النتيجة تخص حصة محددة.

---

# 11. مراجعة الأجزاء

الجزء ليس Status واحدًا.

يجب تحويله إلى Items مستقلة.

الحالات:

```text
completed
repeat
not_heard
```

الحصة التالية تقترح فقط:

```text
repeat + not_heard
```

ولا تنتقل `completed` تلقائيًا.

## مهم: حدود الجزء داخل السورة

إذا بدأ/انتهى الجزء وسط سورة، خزّن `fromAyah/toAyah` لذلك item.

مثال: لا يجوز أن يتحول جزء يحتوي جزءًا من سورة إلى «السورة كاملة» دون قرار المحفظ.

زر النص يفتح النطاق الحقيقي لا السورة كاملة.

---

# 12. مراجعة مجموعة السور

نفس Item-level logic.

الاقتراح التالي:

- قابل للقبول.
- قابل للحذف.
- قابل للإضافة.
- قابل لإعادة الترتيب.

## Reorder UX إلزامي

وفر أحد الخيارين:

- Drag handle مع دعم Touch وKeyboard fallback.
- أو أزرار `↑ / ↓` واضحة.

ترتيب `items[]` نفسه هو Source of Truth.

---

# 13. Duplicate review items

إذا ظهرت نفس السورة من أكثر من Group:

- لا تفقد مصدرها.
- لا تكررها بلا تفسير في Next Review.
- Smart suggestion يمكن أن deduplicate presentation، لكن يجب أن يحتفظ بالـsource group metadata داخليًا.

حدد سياسة الدمج في الكود والاختبارات.

---

# 14. Smart Review

Smart Review = suggestion فقط.

يجب أن يعرض للمحفظ:

- العناصر المقترحة.
- سبب الاقتراح إن أمكن.

ويوفر:

- قبول.
- تعديل.
- حذف.
- إضافة.
- تغيير ترتيب.

لا يعدل Final assignment تلقائيًا.

---

# 15. Offline session safety

أي إدخال داخل الحصة يجب أن يحفظ Local-first، خصوصًا:

- attendance.
- previous grades.
- review outcomes.
- errors.
- notes.
- next assignment.
- accordion state.
- weekly hadith/dua outcomes إن كانت داخل الحصة.

يجب ألا يؤدي rerender/navigation/temporary offline إلى فقد state.

إن كان Sync backend موجودًا بالفعل، استخدمه. لا تضف Firebase لمجرد أن الـPROMPT ذكر API/Firebase كمثال للفحص.

---

# 16. Backup/Migration

كل Schema migration يجب أن تُختبر في أربع حالات:

1. Startup على بيانات قديمة.
2. Import backup قديم أثناء نفس التشغيل.
3. Restore auto backup قديم.
4. Pull/restore من sync قديم إن كانت المزامنة موجودة.

Migration يجب أن تكون:

- Idempotent.
- لا تمسح الحقول القديمة فورًا.
- تحفظ Legacy compatibility حتى تأكيد استقرار Release.

---

# 17. WhatsApp

الرسالة مختصرة وواضحة على الهاتف.

تحتوي:

- الطالب.
- تاريخ الحصة.
- نتيجة التسميع.
- المستوى.
- التكليف القادم.
- المراجعة غير المتقنة عند قبولها.
- ملاحظة المحفظ.
- اسم الأكاديمية.
- الشعار النصي.
- Facebook URL من Settings فقط.

لا Hard-code للرابط داخل Message component.

يمكن توفير default setting أول مرة، لكن المستخدم يجب أن يستطيع تغييره أو تركه فارغًا.

---

# 18. الحديث النبوي

الهدف Release content:

**200 حديث موثق**، وليس 4 placeholder records.

لكل حديث:

```text
id
text
narrator
source
hadithNumber
book?
chapter?
grade
category
reference
sourceUrl/sourceId إن أمكن
```

ممنوع:

- نص مولد.
- تخريج تقديري.
- رقم ملتبس مثل `6013/6018 بحسب الترقيم`.

إذا لم يكن المرجع مؤكّدًا: لا يدخل Production corpus.

UI:

- حفظته ✓.
- إضافة لطالب.
- نسخ.
- التالي.
- Filters قابلة للتوسع.

---

# 19. الأدعية والأذكار

الهدف Release content:

**60 عنصرًا موثقًا**.

مصادر أساسية:

- القرآن.
- السنة الصحيحة.
- حصن المسلم مع مرجع الأصل الحديثي حيث أمكن.

لكل عنصر:

```text
id
text
occasion
source
repeatCount
category
reference
sourceUrl/sourceId?
```

لا Placeholder بلا مصدر.

---

# 20. ربط الحديث/الدعاء بالطالب والحصة

ليس Library فقط.

Student assignment:

```text
contentId
type
assignedAt
status
history[]
```

داخل الحصة التالية يظهر Block صغير قابل للطي:

```text
حديث الأسبوع / دعاء الأسبوع
✓ حفظه
↺ يعاد
```

كل تقييم يسجل:

- sessionId.
- status.
- evaluatedAt.
- optional notes.

ولا يختفي history عند إعادة تعيين محتوى جديد.

---

# 21. Mushaf Offline — تعريف دقيق للـDirect Download

المصحف:

```text
مصحف المدينة النبوية
حفص عن عاصم
604 صفحات
```

## المستوى A — In-app controlled download

لا تعتبره متحققًا إلا إذا أمكن فعليًا:

- CORS يسمح `fetch`.
- `Content-Length` متاح لعرض Progress حقيقي.
- stream/chunks لا تجمد UI.
- Cancel عبر `AbortController`.
- Resume فقط إذا يدعم الخادم `Accept-Ranges/Range` أو استراتيجية chunks موثوقة.

عندها اعرض:

- bytes downloaded.
- total bytes.
- percent.
- Pause إن كان حقيقيًا.
- Resume إن كان حقيقيًا.
- Cancel.

## المستوى B — External download + import

إذا CORS/Range/headers لا تسمح:

- اعرض بوضوح أنه تنزيل خارجي.
- افتح المصدر.
- بعد اكتماله: Import PDF.
- لا تعرض fake progress/pause/resume.

هذا Fallback مقبول ومعلن، لكنه لا يُسمى in-app downloader.

---

# 22. Themes

Palette A default:

```text
Primary        #145A3A
Primary Dark   #0C3B28
Gold           #C9A84C
Background     #F7F4EC
Surface        #FFFFFF
Surface Soft   #F0F4F1
Text           #17221C
Muted          #66736C
Success        #258553
Warning        #C77A20
Danger         #C54242
```

مع B/C/D كما في المواصفات الأصلية.

## شرط Architecture

لا يكفي حفظ theme key.

يجب أن تؤثر Semantic tokens المختارة على الـShell الفعلي المستخدم في الواجهة.

افصل:

- Color palette.
- Light/Dark appearance.

ولا تجعل تغيير Palette يكسر Dark mode.

---

# 23. PWA

تحقق من:

- 192×192.
- 512×512.
- maskable safe zone.
- favicon.
- apple-touch-icon.
- `theme_color`.
- `background_color`.
- standalone.
- اسم التثبيت «أكاديمية الإمام».
- Service Worker cache version مطابق للإصدار.

كل Release يرفع Version ويغير cache namespace عند الحاجة.

---

# 24. Accessibility / RTL

يشمل:

- `dir=rtl`.
- أرقام ونسب سليمة.
- progress direction مفهوم.
- keyboard navigation.
- focus-visible.
- ARIA للـcombobox/accordion/modals.
- Touch target لا يقل تقريبًا عن 44px للأزرار الأساسية على الهاتف.
- Contrast مناسب.
- no horizontal overflow على 390px.
- no horizontal overflow على Desktop.

---

# 25. Error handling في Vanilla JS

إذا المشروع ليس React، لا تضف React Error Boundary كمصطلح فارغ.

استخدم المكافئ المناسب:

- try/catch حول async boundaries.
- global error logging عند الحاجة.
- UI error states.
- retry.
- safe fallback.
- عدم فقد draft.

---

# 26. QA إلزامي قبل التسليم

## Static

- JS syntax.
- duplicate HTML IDs.
- inline handler resolution.
- version consistency.
- Manifest.
- Service Worker app shell.
- migration markers.
- regression guards.

## Runtime Browser

اختبر على الأقل:

- Mobile viewport 390×844.
- Desktop 1366×900.
- التنقل لكل الصفحات الرئيسية.
- console errors = 0.
- page errors = 0.

## Session scenarios

1. new/rec/far بتقييمات مختلفة.
2. 6 completed + 2 repeat.
3. `✓ ✓ ↺ ✓ — ✓ — ✓` ينتقل ↺ + — فقط.
4. ضعيف: لا repeat قبل click.
5. Session accordions state survives rerender/draft restore.
6. Quran text open لا يفقد session state.
7. Offline interruption على Origin حقيقي.
8. PWA install على Android/Chrome حقيقي.
9. Mushaf direct/fallback path حسب capabilities.
10. WhatsApp fields + Facebook setting.
11. Backup vOld → import → migration دون restart.
12. Home section collapse survives rerender/navigation.
13. Surah dropdown: open/close/reopen/touch/keyboard/outside click/viewport placement.
14. Juz 29 يبدأ الملك، Juz 30 يبدأ النبأ، واختبر boundary ayahs للأجزاء ذات السور المشتركة.

إذا تعذر Test بسبب البيئة، اكتبه `Not testable here` ولا تحوله إلى PASS.

---

# 27. Release discipline

عند أي Release:

- bump `VERSION`.
- bump package/app/sw meta versions.
- update cache version.
- update CHANGELOG.
- update Release notes.
- regenerate checksums.
- run static tests.
- run browser smoke.

لا تسلم ZIP قبل نجاحهما.

---

# 28. ممنوعات

- إعادة بناء المشروع بلا داعٍ.
- كسر البيانات القديمة.
- حذف Feature لأنه غير ظاهر في Home.
- تكرار Assignment تلقائيًا بسبب ضعف الطالب.
- part-level pass/fail فقط.
- AI religious content.
- fake download progress.
- fake pause/resume.
- hard-coded student data.
- Facebook link hard-coded داخل الرسالة.
- إغراق Home.
- إضافة الأخضر لكل شيء.
- إضافة override جديد دون فحص duplicates.
- إعلان QA ناجح دون تشغيله.

---

# 29. Definition of Done

لا تعتبر المهمة مكتملة إلا إذا:

- Item-level review يعمل ويُحفظ.
- `repeat/not_heard` فقط يدخلان Next suggestion.
- completed لا ينتقل تلقائيًا.
- weak repeat يحتاج click.
- Surah combobox يعمل Touch/Desktop بلا reopen/close races.
- Home content sections قابلة للطي وحالتها محفوظة.
- Quran text لا يفقد Session state.
- Juz mapping صحيح، وحدود الآيات ممثلة عند الحاجة.
- Backup/restore يعيد تشغيل Migration الحالي.
- WhatsApp يستخدم Settings.
- Palette A فعلية على الـvisible shell.
- PWA files صحيحة.
- console/page errors = 0 في Browser smoke.
- المحتوى الشرعي النهائي موثق فقط.
- أي جزء غير مكتمل موصوف بوضوح في Release report.

الفلسفة النهائية:

> **المحفظ يرى ما يحتاجه الآن، والبرنامج ينظم التفاصيل في الخلفية دون مفاجآت، ودون فقد بيانات، ودون ذكاء شكلي يزدحم على الشاشة.**
