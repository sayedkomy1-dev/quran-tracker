# نشر أكاديمية الإمام v7.0.0

## قبل الرفع

إذا كانت هناك نسخة مستخدمة فعلياً، صدّر Backup JSON أولاً.

تأكد أن جذر المستودع يحتوي مباشرة على:

- `index.html`
- `app.js`
- `styles.css`
- `sw.js`
- `manifest.json`
- `favicon.png`
- `icon-96.png`
- `icon-192.png`
- `icon-512.png`
- `icon-maskable.png`
- `CNAME`

## فحص النسخة

إذا كان Node.js مثبتاً:

```bash
npm test
```

## تشغيل تجريبي محلي

```bash
python3 -m http.server 8080
```

ثم افتح `http://localhost:8080`.

اختبر على مقاسين على الأقل:

- هاتف Android أو Device Emulation بعرض 360–430px.
- Windows/Chrome أو Edge بعرض 1024px فأكبر.

## GitHub Pages

من المستودع:

**Settings → Pages → Build and deployment → Deploy from a branch**

ثم:

- Branch: `main`
- Folder: `/(root)`

ملف `CNAME` الحالي يحتوي:

```text
welivequran.online
```

تأكد من إعداد DNS ثم فعّل **Enforce HTTPS**. التثبيت كـPWA يحتاج HTTPS في النشر الحقيقي.

## ترقية إصدار لاحق

عند إصدار نسخة جديدة غيّر القيم التالية معاً:

1. `APP_VERSION` في `app.js`.
2. `<meta name="application-version">` في `index.html`.
3. `CACHE_NAME` و`APP_VERSION` في `sw.js`.
4. `VERSION`.
5. `package.json`.
6. `CHANGELOG.md`.

إذا تغير نموذج البيانات، ارفع `SCHEMA_VERSION` أيضاً وأضف Migration داخل `migrateData()` وSanitization للاستيراد.

## Checklist بعد النشر

- فتح الرئيسية والتأكد أن مركز اليوم يظهر.
- إضافة طالب مع مجموعة وجدول أسبوعي.
- تسجيل حضور ثم فتح نفس الطالب في الحصة والتأكد من عدم إنشاء Duplicate لنفس اليوم.
- إضافة مهمة، تعليمها كمكتملة، ثم فلترة المتأخرة/اليوم.
- تجربة `Ctrl/⌘ + K` على Windows.
- تجربة تثبيت PWA على Android وWindows.
- إغلاق الشبكة وإعادة فتح التطبيق بعد أول زيارة ناجحة.
- تصدير Backup ومشاركته، ثم استيراده في متصفح تجريبي.
- اختبار التقرير والطباعة والشهادة.
- التأكد من ظهور Banner التحديث عند نشر Service Worker بإصدار جديد.

## ملاحظة عن Android وWindows

v7 يستخدم PWA كطبقة تشغيل مشتركة. لا توجد نسختان منفصلتان من الكود؛ نفس المشروع يتكيف عبر CSS/Manifest/APIs مع الهاتف والكمبيوتر. هذا يقلل اختلاف السلوك ومشاكل صيانة نسختين.
