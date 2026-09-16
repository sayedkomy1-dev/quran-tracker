# أكاديمية الإمام — v10.1.0 Runtime UX Hardening

## تم إصلاحه

- جميع سيكشنات المحتوى المرئية في الصفحة الرئيسية أصبحت قابلة للفتح/الغلق مع حفظ حالتها.
- إصلاح Surah combobox على الهاتف والكمبيوتر: فتح/غلق، touch/pointer، stale blur، ARIA، وتموضع أعلى/أسفل.
- تصحيح خريطة الأجزاء إلى 30 جزءًا، مع التحقق من جزء تبارك وعمّ.
- ربط Themes A/B/C/D بالـv9.2 shell المرئي فعليًا.
- تشغيل v10 migration بعد Backup import / Auto-backup restore / Cloud pull.
- السماح بأن يكون Facebook URL فارغًا عمدًا بدون إعادة القيمة الافتراضية.
- تصحيح مرجع حديث «من لا يرحم لا يرحم» إلى صحيح البخاري 6013.
- تحسين دفاعية إخفاء Splash.
- توسيع Static regression checks.

## Runtime QA

- Chromium mobile 390×844: PASS.
- Chromium desktop 1366×900: PASS.
- Navigation smoke لكل الصفحات الأساسية: PASS.
- Review scenario `✓ ✓ ↺ ✓ — ✓ — ✓`: PASS.
- Weak grade explicit repeat: PASS.
- Final page errors: 0.
- Final console errors: 0.

## ما يزال خارج نطاق الاكتمال

- corpus نهائي 200 حديث/60 ذكر.
- item ayah bounds للأجزاء التي تبدأ/تنتهي وسط سورة.
- reorder UI صريح لاقتراح المراجعة.
- in-app Mushaf streaming/pause/resume؛ الحالي external download + import fallback.
- Android PWA real-device release QA.
- refactor للدوال المتكررة في app.js/v9.js.
