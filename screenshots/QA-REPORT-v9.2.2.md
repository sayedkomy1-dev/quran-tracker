# QA Report — Imam Academy v9.2.2

## الفحوصات الآلية

- JavaScript syntax: `app.js`, `v8.js`, `v9.js`, `sw.js`.
- تطابق رقم الإصدار بين `VERSION`, `package.json`, HTML, app.js وService Worker.
- Schema Version = 11.
- التحقق من الملفات المحلية المشار إليها من HTML.
- التحقق من عدم وجود Static DOM IDs مكررة.
- التحقق من وظائف v9 الحرجة ومن عدم إخفاء أزرار الحفظ/الإرسال بواسطة CSS.
- التحقق من Inline handlers مقابل الدوال المتاحة.
- Regression guards لـ PIN PBKDF2، الطلاب غير النشطين في تعارضات المواعيد، إعادة التنشيط، تنظيف Voice Notes، فشل صفحة المصحف الآمن، `aria-current` وحد Runtime Cache.
- التحقق من وجود أصول المشروع الكامل: branding، screenshots، SQL.

## النتيجة

يجب أن ينتهي `npm test` بالرسالة:

`Static checks passed for Imam Academy v9.2.2`
