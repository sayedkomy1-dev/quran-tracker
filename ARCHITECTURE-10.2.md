# Architecture Refactor — v10.2.0 (Stage 1)

## الهدف
تقليل الاعتماد التاريخي على أن «آخر function declaration يتم تحميلها هي التي تفوز» من غير تغيير UX أو Schema أو بيانات المستخدم.

## قبل التعديل
- تحميل متسلسل: `app.js → v8.js → v9.js → v10.js`.
- v10 كان يعيد تعريف دوال عامة مثل `buildSesData`, `captureDraft`, `applyDraft`, `loadPrevTask`, وSurah dropdown handlers كـfunction declarations جديدة.
- بيانات Themes / Hadith / Dua / Juz ranges كانت داخل `v10.js` مع UI/workflow logic.
- لا يوجد namespace رسمي للتوسعات الحديثة.

## بعد التعديل
- `js/core/runtime.js` ينشئ `window.ImamApp` ويحتوي:
  - `ImamApp.meta` للإصدار وSchema.
  - `ImamApp.Utils` للـescape/id/grade normalization.
  - `ImamApp.Legacy.override()` لتسجيل أي Compatibility override بشكل صريح وقابل للتدقيق.
- `js/features/v10-data.js` يفصل البيانات الثابتة المصدرية عن UI/workflow code:
  - Juz ranges.
  - themes.
  - starter Hadith/Dua records.
- v10 لم يعد يعيد تعريف 12 دالة legacy بنفس أسمائها كـdeclarations؛ يسجلها صراحة عبر registry.
- Service Worker يضم الملفات المعمارية الجديدة في App Shell.

## Compatibility
- جميع أسماء الدوال العامة المطلوبة بواسطة inline HTML handlers ما زالت متاحة على `window` عبر adapters.
- Schema يبقى 12.
- لا Migration جديدة.
- لا تغيير مقصود في IndexedDB/localStorage/account-scoped storage أو Safe Multi-Device Sync.

## قياس الدين التقني
- duplicate function-name groups (regex audit across core JS): من 72 إلى 67.
- لا توجد duplicate declaration بين `v10.js` وطبقات legacy للأسماء التي تم Refactor لها.
- v8/v9 legacy overrides ما زالت موجودة وسيتم تفكيكها تدريجيًا في مراحل لاحقة، وليس بحذف شامل عالي المخاطر.

## المرحلة التالية
بعد إثبات v10.2.0 على الجهاز الحقيقي:
1. استخراج Quran/audio feature boundary.
2. إنشاء Quran Teaching Engine الجديد فوق modules واضحة، بدون إضافة `v11.js`.
3. نقل المزيد من v8/v9 overrides عند لمسها مع regression tests لكل وظيفة.
