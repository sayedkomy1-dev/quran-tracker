# QA Report — v10.5.0

## Static / automated
- JavaScript syntax: PASS
- Existing project tests (`npm test`): PASS
- Version consistency across runtime, HTML, package, Service Worker: PASS
- Guardian grade mapping: PASS
- Guardian notes section: PASS
- Guardian next-assignment section: PASS
- Short/detailed WhatsApp modes use upgraded formatting: PASS

## Manual acceptance
1. افتح حصة لطالب له رقم WhatsApp صحيح.
2. سجّل تقييمات مختلفة، واكتب ملاحظة في `ملاحظات لولي الأمر`.
3. اضغط `حفظ وإرسال لولي الأمر`.
4. تأكد أن التاريخ مكتوب كنص فقط بدون أيقونة تقويم تعرض FEB 24.
5. تأكد من ظهور:
   - ممتاز ⭐⭐⭐
   - جيد جدًا ⭐⭐
   - جيد ⭐
   - يحتاج متابعة 😕 عند التقييم الضعيف.
6. تأكد أن نطاق الآيات ظاهر تحت كل تقييم.
7. تأكد أن ملاحظات المحفظ تظهر إذا كانت مكتوبة، ولا يظهر القسم إذا كان الحقل فارغًا.
8. جرّب `رسالة مختصرة` و`رسالة تفصيلية` وتأكد أن كليهما يفتح WhatsApp على الرقم الصحيح.
