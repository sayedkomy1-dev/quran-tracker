# Changelog

## 10.1.0-clean

- أُضيف منطق تسميع الحديث والدعاء السابق: حفظه / يعاد.
- أُضيف ربط الحديث أو الدعاء من المكتبة مباشرة كتكليف أسبوعي لطالب.
- أُضيف Pause / Resume / Cancel لتنزيل المصحف داخل التطبيق مع دعم HTTP Range عند توفره.
- أُبقي fallback التنزيل الخارجي + استيراد PDF عند منع CORS.
- ثُبتت متطلبات الحصة: Accordions للأخطاء والاقتراح، نفس التكليف عند ضعيف، وترحيل المتبقي فقط في الأجزاء والسور.
- تحديث رابط مصدر صحيح البخاري إلى مستودع AhmedBaset المثبت على tag v1.2.0.
- تحديث Cache version لمنع بقاء ملفات v10.0 القديمة.

## 10.0.0-clean — foundation

- إعادة بناء PWA من الصفر بدون Python وبدون v8/v9 runtime layers.
- Home مبسطة ونظام ألوان جديد.
- IndexedDB architecture جديدة.
- إعادة تصميم الحصة وإزالة أي شريط حفظ عائم.
- Accordion للأخطاء واقتراح المراجعة.
- Same assignment عند ضعف التسميع.
- Partial juz/surah review tracking.
- Quran text modal + Husary/Mishary controls.
- Mushaf download progress + local PDF import.
- WhatsApp templates + Facebook link.
- PWA install icons and maskable icon.
