# نشر أكاديمية الإمام v9.2.2 — GitHub Ready

## قبل الترقية

> ارفع **كل ملفات v9.2.2** مع الاستبدال، بما فيها المجلدات `branding/`, `screenshots/`, `screenshots-v9.1/`, `sql/`, `tests/` و`.github/`. الكاش الجديد `quran-pwa-v9.2.2` و`skipWaiting` يساعدان على استبدال النسخة السابقة سريعًا.


1. افتح النسخة الحالية المستخدمة فعليًا.
2. صدّر Backup JSON واحفظه خارج المتصفح.
3. لا تمسح Site Data بعد رفع النسخة الجديدة.
4. اختبر v9 على نفس الدومين، وتأكد أن الطلاب والحصص ظهرت قبل حذف أي نسخة احتياطية.

Schema الحالي: **11**.

## الملفات المطلوبة في جذر المستودع

```text
index.html
styles.css
v9.css
app.js
v8.js
v9.js
sw.js
manifest.json
favicon.png
icon-96.png
icon-192.png
icon-512.png
icon-maskable.png
CNAME
README.md
CHANGELOG.md
MUSHAF-SOURCES.md
```

ومع المجلدات الموجودة مثل:

```text
branding/
sql/
tests/
```

## الفحص قبل الرفع

```bash
npm test
node --check app.js
node --check v8.js
node --check v9.js
```

ثم:

```bash
python3 -m http.server 8080
```

وافتح `http://localhost:8080`.

## GitHub Pages

**Settings → Pages → Build and deployment → Deploy from a branch**

- Branch: `main`
- Folder: `/(root)`

`CNAME` يحتوي على:

```text
welivequran.online
```

فعّل **Enforce HTTPS** بعد اكتمال إعداد DNS. HTTPS ضروري لأفضل تجربة PWA وWebAuthn.

## الترقية من v8

ارفع ملفات v9 فوق ملفات v8 مع الاستبدال. لا ترفع ZIP نفسه إلى Pages.

الملفات الجديدة الأهم:

- `v9.js` — طبقة UX/Product الجديدة.
- `v9.css` — Design System والـresponsive layouts.
- `MUSHAF-SOURCES.md` — مصادر المصحف الرسمي.

كما تغيرت `index.html`, `app.js`, `sw.js`, `manifest.json` وملفات التوثيق.

## Checklist بعد النشر

- الرئيسية تعرض Command Center الجديدة ولا تعرض بطاقات v8 القديمة.
- Bottom Nav على الهاتف وSidebar على Windows.
- الطلاب يدعمون Active / Paused / Archived والتثبيت.
- التحديد المتعدد يعمل دون تحديد مستلمين غير مختارين عند الرسالة الجماعية.
- شاشة الحصة تدعم «مبسّط» و«سريع».
- خطوات الحصة الأربع تعمل والتنقل لا يمس البيانات المدخلة.
- الحفظ التلقائي للمسودة يعمل.
- زر «النص» يفتح النص العثماني ويشغل الحصري/العفاسي.
- السرعة والتكرار ووضع التلقين تعمل.
- Mini Player يبقى بعد إغلاق نافذة النص أثناء التشغيل.
- صفحة «المصحف» تفتح المصدر الرسمي.
- استيراد PDF يحفظه على الجهاز، ويفتح الصفحات 1–604.
- آخر صفحة والعلامات ووضع الصفحتين يعملان.
- من زر «صفحة المصحف» في نطاق الحفظ يفتح موضع الآية الصحيح بعد تثبيت PDF.
- «حضر الجميع» يعمل ثم يمكن تعديل الحالات فرديًا.
- PIN/Windows Hello والنسخ الاحتياطية والمزامنة من v8 ما زالت تعمل.
- أوقف الشبكة بعد أول تحميل وتأكد أن App Shell يعمل Offline.

## ملاحظة عن مصحف المدينة

v9 لا يضم ملف المصحف الكبير داخل ZIP الخاص بالتطبيق حتى يبقى التثبيت خفيفًا. زر التحميل يفتح المصدر الرسمي لمجمع الملك فهد. بعد تنزيل PDF يثبته المستخدم محليًا داخل التطبيق، وبذلك يصبح متاحًا Offline دون رفع الملف إلى GitHub أو إلى خادم التطبيق.

راجع `MUSHAF-SOURCES.md`.
