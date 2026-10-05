# أكاديمية الإمام — Release 10.1.1

## النوع
Security & Stabilization release.

## ما تغير
- Portable backup أصبح sanitized ولا يحمل أسرار PIN/WebAuthn/Cloud Sync.
- Auto Backup المحلي ما زال Internal لاستعادة نفس الجهاز.
- Cloud Sync انتقل من direct REST table access إلى RPC محمية بسر وصول مستقل.
- Supabase SQL يغلق سياسات anon المفتوحة ويلغي table grants المباشرة.
- إضافة مولّد محلي لـSync ID وسر وصول عشوائيين.
- تحديث Cache ونسخة التطبيق إلى 10.1.1.

## Schema
لا تغيير: Schema 12.

## ملاحظة للمزامنة القديمة
صفوف المزامنة القديمة التي لا تحتوي `auth_hash` لا يمكن Claim لها آليًا دون مخاطرة أمنية. حافظ على النسخة المحلية، احذف صف Cloud القديم من Dashboard، ثم ادفع نسخة جديدة بعد إنشاء بيانات وصول آمنة.
