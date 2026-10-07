# QA Report — v10.10.0 Guardian & Student Portal Stage 2

## النتيجة
PASS

## ما تم فحصه
- جميع اختبارات v10.9.0 وStage 1 السابقة ما زالت تمر.
- JavaScript syntax للـ Guardian Portal share/view.
- Stage 1 Snapshot ما زالت تعمل بدون Backend.
- Stage 2 تنشر Snapshot إلى RPC باسم `guardian_portal_publish`.
- رابط Stage 2 يحتوي UUID Token فقط داخل fragment ولا يكشف `studentId` أو رقم الهاتف.
- `student_ref` SHA-256 ثابت لنفس الطالب/المحفظ.
- `guardian_portal_status` و`guardian_portal_revoke` يعملان فقط من حساب محفظ Active.
- الإيقاف ثم إعادة النشر يغير Token حتى لا يعود الرابط القديم للعمل.
- القراءة العامة تمر فقط من `guardian_portal_read(token)` ولا توجد صلاحية مباشرة على الجدول.
- الرابط العام يتوقف إذا كان حساب المحفظ المالك غير Active.
- الرابط الحي لا يخزن Snapshot دائمًا على جهاز ولي الأمر؛ عند Offline تظهر رسالة مغلقة بدل بيانات قديمة بعد الإلغاء.
- Service Worker cache تم تدويره إلى `quran-pwa-v10.10.0-s2` لضمان وصول ملفات Stage 2 الجديدة.
- `noindex / nofollow / noarchive` ما زال مفعّلًا.
- الطباعة/PDF والمشاركة مستمران.

## Schema / Data Safety
- Local Schema = 12 بدون تغيير.
- لا تعديل على بيانات الطلاب أو الحصص.
- لا تعديل على `account_sync`.
- SQL جديد محدود ومستقل: `sql/guardian-portal-live.sql`.
- `guardian_portal_shares` لا يملك Direct browser access.
