# نشر الإصدار 6 على GitHub Pages

## 1) قبل الرفع

إذا كانت هناك نسخة قديمة مستخدمة فعلياً، صدّر منها نسخة احتياطية JSON أولاً.

تأكد أن جذر المستودع يحتوي مباشرة على:

- `index.html`
- `app.js`
- `styles.css`
- `sw.js`
- `manifest.json`
- `CNAME`
- ملفات الأيقونات

لا تضع هذه الملفات داخل مجلد فرعي إضافي إذا كان GitHub Pages سيُنشر من `/(root)`.

## 2) رفع الملفات

مثال من Git:

```bash
git init
git add .
git commit -m "Release v6.2.0"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

## 3) إعداد Pages

من المستودع:

**Settings → Pages → Build and deployment → Deploy from a branch**

ثم:

- Branch: `main`
- Folder: `/(root)`

## 4) الدومين

ملف `CNAME` الحالي يحتوي:

```text
welivequran.online
```

بعد اكتمال GitHub Pages، تأكد من أن DNS للدومين يشير إلى GitHub Pages بالطريقة المناسبة لحسابك/مستودعك، ثم فعّل **Enforce HTTPS** عندما يصبح الخيار متاحاً.

## 5) تحديث إصدار لاحق

عند إصدار نسخة جديدة:

1. غيّر `APP_VERSION` في `app.js`.
2. غيّر `<meta name="application-version">` في `index.html`.
3. غيّر `CACHE_NAME` في `sw.js`.
4. حدّث `CHANGELOG.md`.
5. ادفع التغييرات إلى `main`.

عند اكتشاف Service Worker الجديد سيظهر داخل التطبيق تنبيه «يوجد إصدار جديد» ويمكن للمستخدم الضغط على «تحديث الآن».

## 6) التحقق بعد النشر

اختبر:

- فتح الصفحة الرئيسية.
- إضافة طالب وحفظ الجدول الأسبوعي.
- تسجيل حضور وحصة لنفس الطالب والتأكد من عدم إنشاء سجلين لليوم نفسه.
- إغلاق الشبكة وفتح التطبيق مرة أخرى بعد زيارته مرة واحدة على الأقل.
- تصدير Backup ثم استيراده على متصفح تجريبي.
- الطباعة/الحفظ PDF للتقرير والشهادة.
- زر تحديث التطبيق بعد أي Release لاحق.
