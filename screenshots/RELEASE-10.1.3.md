# We Live Quran v10.1.3 — Account Ownership & Cloud Backup

## الهدف
ربط بيانات ما قبل تسجيل الدخول بالحساب الصحيح بدون حذفها، ومنع أي حساب آخر على نفس الجهاز من رؤية بيانات غيره، ثم توفير نسخة سحابية مشفرة مملوكة للحساب.

## الجديد
- IndexedDB وlocalStorage أصبحا account-scoped باستخدام `auth.uid()`.
- Wizard يظهر عند وجود بيانات Legacy ويعرض عدد الطلاب والحصص والمهام قبل ربطها بالحساب.
- Legacy snapshot لا يُحذف أثناء الترحيل.
- مسودات الحصص والنسخ التلقائية معزولة لكل حساب.
- `account_sync` جديد: صف سحابي واحد لكل مستخدم authenticated.
- لا يوجد Sync ID أو Access Secret يدوي بعد الآن.
- الاستعادة على جهاز جديد تحتاج نفس Google account + كلمة تشفير النسخة فقط.
- Cloud payload يظل AES-GCM مشفرًا محليًا؛ كلمة التشفير لا تُرسل للخادم.
- Schema ما زال 12؛ لا Migration لبيانات الطلاب نفسها.

## قبل النشر
شغّل `sql/account-sync.sql` مرة واحدة في Supabase SQL Editor.
