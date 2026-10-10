# QA Addendum — v10.10.0 Guardian Phone Login Stage 3

## النتيجة
PASS

## ما تم فحصه
- صفحة دخول عامة مستقلة لا تحمل Teacher Auth أو Cloud Sync.
- رقم الهاتف + PIN فقط هما مدخلات التحقق، ورسالة الخطأ لا تكشف وجود الرقم.
- PIN يتم توليده من `crypto.getRandomValues` ويكون 6 أرقام.
- الـSnapshot المنشور لا يحتوي رقم الهاتف أو IDs داخلية.
- Teacher RPCs تتطلب حساب محفظ Active.
- PIN bcrypt-hashed، والجداول الجديدة محمية بـRLS وDirect grants مسحوبة.
- Failed login lockout موجود: 8 محاولات / 15 دقيقة / قفل 15 دقيقة.
- Guardian Session Token صالح 12 ساعة، ويزال من شريط العنوان بعد التقاطه.
- Session portal يدعم أكثر من طالب للحساب الواحد.
- Logout وPIN reset / unlink تلغي الجلسات ذات الصلة.
- الحصة المحفوظة تحدّث Snapshot دخول الهاتف تلقائيًا عند توفر الإنترنت، بدون إعادة تفعيل الرابط المباشر الموقوف.
- Stage 1 وStage 2 regression tests ما زالت PASS.
- PWA cache generation = `quran-pwa-v10.10.0-s3`.
- Local Schema = 12 ولم تتغير بنية بيانات الطلاب أو الحصص.

---

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


## Stage 2.1 hotfix verification

- Permanent portal entry points: PASS.
- Feature state bridge (`ImamApp.State`): PASS.
- Guardian Portal reads current state instead of `globalThis.students/sessions/settings/curStId`: PASS.
- PWA cache generation bumped to `quran-pwa-v10.10.0-s2h1`: PASS.
- Stage 2 SQL unchanged: PASS.

## Stage 3.1 regression hotfix
- Verified the logged-out auth gate exposes `guardian-login.html` directly.
- Added `tests/guardian-login-entry-check.js`.
- No SQL or data-schema change in this hotfix.
