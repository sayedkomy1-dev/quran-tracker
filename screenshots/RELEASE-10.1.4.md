# We Live Quran v10.1.4 — Safe Multi-Device Sync

## الهدف
منع فقدان التغييرات أو عودة البيانات المحذوفة عند استخدام نفس حساب المعلم على أكثر من جهاز.

## التغييرات
- Tombstones دائمة لحذف الطلاب والمهام، وحذف الطالب يسجل أيضًا حذف حصصه ومهامه التابعة.
- `sync-core.js` لدمج deterministic حسب `updatedAt` مع أولوية الحذف عند التعادل.
- `deviceId` محلي لكل جهاز و`updatedByDevice` للسجلات.
- بروتوكول Sync v2: Pull → Merge → Push.
- `revision` على صف `account_sync` وCompare-And-Swap عند الرفع.
- إعادة محاولة آلية عند Revision conflict بدل الكتابة فوق Snapshot أحدث.
- إيقاف RPCs القديمة Last-Write-Wins للحسابات authenticated.
- Auto Sync يتوقف مرة واحدة عند الترقية لحين اختبار جهازين.

## التوافق
- Schema: 12 (بدون Migration لبنية الطلاب/الحصص).
- بيانات v10.1.3 المحلية والسحابية تبقى قابلة للدمج؛ أول Push بعد SQL v10.1.4 يرفع Revision من 0 إلى 1.

## خطوة Supabase المطلوبة
شغّل `sql/account-sync.sql` من هذا الإصدار قبل نشر التطبيق أو مباشرة قبله. بعد تشغيله لن تستطيع نسخة v10.1.3 القديمة استخدام RPCs القديمة، لذلك انشر v10.1.4 فورًا بعد نجاح SQL.
