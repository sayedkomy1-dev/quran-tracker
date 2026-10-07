# QA Report — v10.9.0 Circle Analytics & Reports Center

**Result: PASS**

## Automated suite
تم تشغيل `npm test` بنجاح، وشمل:
- Static architecture/runtime checks.
- Recitation carry-forward checks.
- Quran structure: 30 جزء / 60 حزب / 240 ربع.
- KFGQPC ayah-page map: 6236 آية / 604 صفحة.
- Assessment controls.
- Guardian Communication Center.
- Guardian score persistence/report formatting.
- Compact Guardian Report polish.
- Student Progress Dashboard.
- Teacher Follow-up Center.
- **Circle Analytics & Reports Center** static + runtime aggregation smoke test.

## Circle analytics smoke test
تم تشغيل سيناريو بيانات تجريبي يحقق الآتي:
- استبعاد الطالب `paused` من التحليل.
- فلترة صحيحة حسب الحلقة.
- حساب متوسط إتقان الحلقة بمتوسط الطلاب: 90% و60% = **75%**.
- حساب الحضور مع استبعاد الإجازة: 2 حضور / (2 حضور + 1 غياب) = **67%** بعد التقريب.
- جمع الإعادات وآيات الحفظ الجديد من لوحات تقدم الطلاب.
- اكتشاف طالب متحسن وطالب متراجع من اتجاه الأداء.
- تجميع موضع ضعيف من الحفظ وموضع مراجعة «إعادة» داخل الفترة المختارة، حتى عند وجود Score أعلى من 65% مع حالة إعادة صريحة.
- التحقق من أن فلترة اسم الحلقة تتجاهل المسافات الزائدة دون تعديل بيانات الطالب.
- التحقق من وجود مشاركة الملخص عبر Web Share مع fallback للنسخ.

## Regression notes
- Schema بقي **12**.
- لا SQL ولا تعديل Supabase.
- بيانات الطلاب والحصص لا تتغير من مركز التحليلات.
- تقرير الطالب الشهري القديم، Student Progress، Teacher Follow-up، المصحف، المزامنة والنسخ الاحتياطي لم تتغير وظيفيًا.
- `circle-analytics.js` مضاف إلى Service Worker للعمل Offline بعد تحديث الـPWA.
