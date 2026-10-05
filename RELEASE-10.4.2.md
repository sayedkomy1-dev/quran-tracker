# We Live Quran v10.4.2 — Mushaf Runtime Bridge Hotfix

## لماذا هذا الإصدار؟
على بعض أجهزة Android ظل مسار PDF القديم ظاهرًا بعد 10.4.1 بسبب تداخل كاش Service Worker مع مراجع دوال v9 القديمة.

## الإصلاحات
- إضافة cache-busting إلى ملفات JS/CSS المحلية.
- جعل Service Worker يستخدم network-first لملفات الكود والإعدادات.
- ربط `renderV9Mushaf` و`openCurrentMushafPage` صراحة بمحرك المصحف الجديد.
- إعادة رسم واجهة المصحف الجديدة فور تحميل وحدة `mushaf-offline.js`.
- لا حذف تلقائي لملف PDF القديم ولا لبيانات الطلاب.

Schema: 12 (بدون تغيير).
