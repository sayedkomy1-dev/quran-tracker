# نشر We Live Quran v10.1.3

## قبل النشر

1. خذ Backup JSON من النسخة الحالية.
2. لا تمسح Site Data؛ الإصدار ما زال على **Schema 12**.
3. تأكد أن Google OAuth Client يحتوي:
   - Origin: `https://welivequran.online`
   - Redirect URI: `https://svtcntalwfmexthcnvqe.supabase.co/auth/v1/callback`
4. في Supabase Authentication > URL Configuration:
   - Site URL: `https://welivequran.online`
   - Redirect URL: `https://welivequran.online/**`

## إعداد قاعدة Supabase

نفّذ مرة واحدة من SQL Editor:

```text
sql/supabase-setup.sql
```

الملف ينشئ `app_users` وRLS/trigger، ويجعل `info.welivequran@gmail.com` Owner نشطًا، ويؤمّن المزامنة للمستخدم authenticated. إذا كان إعداد v10.1.2 منفذًا بالفعل، يكفي تشغيل `sql/account-sync.sql` فقط لإضافة مساحة النسخة السحابية المملوكة للحساب.

**لا تستخدم `service_role` أو `sb_secret_...` داخل الموقع.** الواجهة تستخدم فقط الـPublishable key.

## رفع الموقع

ارفع المشروع كاملًا إلى GitHub Pages/المصدر المتصل بالدومين `welivequran.online`، بما في ذلك:

- `auth.js`, `auth.css`
- `privacy.html`, `terms.html`
- `sql/`
- بقية ملفات PWA

## الفحص

```bash
npm test
node --check auth.js
node --check app.js
node --check v8.js
node --check v9.js
node --check v10.js
node --check sw.js
```

بعد النشر اختبر:

1. دخول `info.welivequran@gmail.com` — يجب أن يدخل كـOwner.
2. دخول Gmail آخر — يجب أن يظهر «الحساب في انتظار التفعيل».
3. من حساب Owner: الإعدادات > صلاحيات الدخول > تفعيل الحساب.
4. تسجيل خروج ثم دخول الحساب الثاني.
5. افتح التطبيق مرة Online ثم افصل الإنترنت وأعد فتحه للتحقق من Trusted Device Offline.
6. أعد الإنترنت وتأكد من إعادة التحقق.
7. على جهاز المعلم القديم: سجّل بالحساب المعتمد، وافق على «ربط البيانات بهذا الحساب»، وتأكد أن عدد الطلاب القديم يظهر كما هو.
8. سجّل خروجًا وادخل بحساب Active مختلف على نفس الجهاز؛ يجب ألا تظهر بيانات المعلم.
9. من الإعدادات ضع كلمة تشفير، ارفع نسخة مشفرة، ثم اختبر التنزيل على جهاز/متصفح آخر بنفس الحساب والكلمة.

## PWA

Cache namespace: `quran-pwa-v10.1.3`.

`privacy.html` و`terms.html` ضمن App Shell حتى تظل الصفحات متاحة بعد التثبيت.
