# Stage 3.3 — Guardian Access Polish & Forgot PIN

## ما تغير
- أول تفعيل للطالب أصبح واضحًا بزر **إنشاء رمز دخول لولي الأمر**؛ النظام يولد PIN عشوائيًا من 6 أرقام ويعرضه للمحفظ مرة واحدة مع نسخ/WhatsApp.
- بعد التفعيل تظهر خيارات **إنشاء PIN جديد** و**إيقاف الدخول** بدل إظهار أزرار غير مناسبة قبل الربط.
- أضيف **إرسال رابط الدخول** عبر WhatsApp بدون إعادة كشف PIN قديم؛ PIN غير محفوظ كنص ولا يمكن استرجاعه.
- صفحة `guardian-login.html` تحتوي الآن زرًا فعليًا **نسيت رمز الدخول؟** يرسل طلبًا للمحفظ.
- المحفظ يرى الطلبات داخل نافذة بوابة ولي الأمر ويستطيع إنشاء PIN جديد أو إغلاق الطلب.

## الأمان
- رد طلب الاستعادة عام سواء كان الهاتف موجودًا أم لا، لمنع اكتشاف أرقام أولياء الأمور.
- حد الطلبات: 3 طلبات مقبولة لكل بصمة هاتف خلال 24 ساعة؛ الزائد يُتجاهل دون كشف السبب.
- إنشاء PIN جديد يلغي كل جلسات ولي الأمر الحالية المرتبطة بالحساب.
- لا يتم تخزين PIN كنص، ولا يتم إرسال OTP/SMS تلقائيًا.
- Local Schema = 12، ولا تغيير في الطلاب أو الحصص.

## قاعدة البيانات
شغّل مرة واحدة فقط على قاعدة موجودة بعد Stage 3:

`sql/guardian-portal-reset-requests.sql`

---

# Stage 3 — Guardian Phone Login + Secure PIN

## الهدف
جعل **الدخول الأساسي لولي الأمر** قائمًا على رقم الهاتف المسجل للطالب + PIN من 6 أرقام، بدل الاعتماد فقط على رابط مباشر. البوابة تظل Read-only ولا تمنح أي صلاحية تعديل.

## التدفق
1. المحفظ يفتح «بوابة ولي الأمر» للطالب ويضغط **تفعيل / ربط**.
2. النظام يستخدم رقم واتساب المسجل في ملف الطالب، وينشئ PIN عند أول تفعيل.
3. المحفظ ينسخ بيانات الدخول أو يرسلها يدويًا عبر WhatsApp.
4. ولي الأمر يفتح `guardian-login.html`، يدخل الهاتف + PIN، ثم ينتقل إلى صفحة الطالب.
5. إذا كان نفس حساب ولي الأمر مرتبطًا بأكثر من طالب، تظهر قائمة لاختيار الطالب.
6. المحفظ يستطيع إعادة تعيين PIN أو إيقاف دخول الهاتف للطالب دون حذف أي طالب أو حصة.
7. بعد حفظ أي حصة، يحاول التطبيق تحديث Snapshot دخول الهاتف تلقائيًا في الخلفية عند توفر الإنترنت، بدون تغيير حالة الرابط المباشر الاختياري.

## الأمان
- رقم الهاتف الكامل لا يُخزن في جداول Stage 3؛ تُخزن بصمة SHA-256 للمطابقة وآخر 4 أرقام فقط.
- PIN يُخزن باستخدام bcrypt عبر `pgcrypto` ولا يعاد من SQL.
- رسائل الخطأ العامة لا تكشف هل الرقم موجود أم لا.
- بعد 8 محاولات فاشلة خلال 15 دقيقة يتم قفل المحاولات 15 دقيقة.
- تسجيل الدخول يصدر Session Token عشوائيًا صالحًا 12 ساعة فقط.
- الـSession Token ينتقل في URL fragment مرة واحدة، ثم يُحفظ في `sessionStorage` ويُزال من شريط العنوان.
- أي Reset للـPIN أو إيقاف الوصول يلغي الجلسات الحالية المرتبطة بالحساب.
- جداول الحسابات والجلسات لا تملك Direct browser access؛ كل الوصول عبر RPCs محددة.

## قاعدة البيانات
- **Local Schema = 12 بدون تغيير.**
- لا تعديل على هيكل بيانات الطلاب أو الحصص أو `account_sync`.
- Migration إضافية: `sql/guardian-portal-login.sql`.
- Stage 2 (`guardian_portal_shares`) يظل هو مصدر الـSnapshots المنشورة، وStage 3 يضيف حسابات ولي الأمر وربطها بالـShares وجلسات الدخول.

## ملاحظة OTP
Stage 3 يستخدم PIN مجانيًا بدون مزود SMS. تصميم البوابة يسمح لاحقًا باستبدال خطوة التحقق بـ SMS OTP دون إعادة بناء صفحة الطالب أو نموذج الصلاحيات.

---

# Quran Tracker v10.10.0 — Guardian & Student Portal

## Stage 2 — Stable Live Link

### الهدف
تطوير بوابة ولي الأمر من لقطة ثابتة فقط إلى **رابط ثابت للطالب يمكن تحديثه وإيقافه** بدون منح ولي الأمر أي صلاحية تعديل على بيانات الأكاديمية.

### الجديد في Stage 2
- رابط حي ثابت لكل طالب بالشكل `guardian-portal.html#p=<token>`.
- عند «تحديث وفتح» أو «تحديث ونسخ الرابط» يتم نشر أحدث Snapshot لنفس الرابط بدل إنشاء رابط جديد كل مرة.
- حالة الرابط تظهر داخل نافذة البوابة: غير منشأ / نشط / متوقف / Offline.
- زر «تحديث فقط» لنشر أحدث بيانات بدون فتح أو نسخ الرابط.
- زر «إيقاف الرابط»؛ بعد الإيقاف لا يعمل الرابط القديم، وأي نشر لاحق يولد Token جديدًا.
- الاحتفاظ بخيار Stage 1: **لقطة ثابتة داخل URL fragment** تعمل بدون Backend جديد.
- صفحة ولي الأمر نفسها ما زالت Read-only، وتدعم المشاركة والطباعة/PDF.
- زر تحديث داخل الرابط الحي لجلب آخر نسخة نشرها المحفظ.

### الخصوصية والأمان
- الرابط الحي يحتوي Token عشوائي UUID فقط داخل `#`؛ لا يحتوي رقم الهاتف أو `studentId` أو `sessionId`.
- `student_ref` المخزن في قاعدة البيانات هو SHA-256 مشتق من حساب المحفظ ومعرّف الطالب، وليس المعرّف الداخلي نفسه.
- لا توجد صلاحية مباشرة للـ `anon` أو `authenticated` على جدول المشاركة. كل الوصول عبر RPCs محددة فقط.
- النشر/الحالة/الإيقاف تتطلب حساب محفظ مسجل الدخول وحالته `active`.
- القراءة العامة تتطلب Token صالحًا وغير موقوف، كما تتوقف تلقائيًا إذا أصبح حساب المحفظ غير Active.
- الروابط الحية **لا تحفظ Snapshot في LocalStorage على جهاز ولي الأمر**؛ لذلك تحتاج الإنترنت وتفشل مغلقة عند عدم الاتصال. لقطة Stage 1 هي خيار Offline المقصود.

### قاعدة البيانات
هذه المرحلة هي أول جزء من البوابة يحتاج Backend محدودًا؛ لا يمكن جعل نفس الرابط يتحدث أو يُلغى بين أجهزة مختلفة بدون مكان آمن لحفظ النسخة المنشورة.

- **Local Schema = 12 بدون تغيير.**
- لا تعديل على جداول الطلاب أو الحصص أو `account_sync`.
- Migration جديدة فقط: `sql/guardian-portal-live.sql`.
- الجدول الجديد مستقل: `guardian_portal_shares`.
- `sql/supabase-setup.sql` تم تحديثه لتشمل Stage 2 في أي تثبيت جديد.

### التفعيل
لترقية قاعدة Supabase الحالية شغّل **مرة واحدة فقط** محتوى:

`sql/guardian-portal-live.sql`

من Supabase SQL Editor. الملف Additive وآمن على البيانات الحالية.

## Stage 1 — Snapshot Link
Stage 1 ما زالت موجودة بالكامل كخيار fallback: صفحة مستقلة Read-only تحمل Snapshot داخل URL fragment، بدون SQL أو Supabase، ولا تتضمن أرقام الهاتف أو المعرّفات الداخلية.


## Stage 2.1 — UI integration hotfix

Stage 2.1 fixes portal discoverability and state access without changing the database. Portal entry buttons are now part of the stable app UI instead of relying only on runtime injection. The portal feature reads current app state through `ImamApp.State`, which safely exposes getters for the existing top-level state without changing Schema 12. The Stage 2 SQL is unchanged.

## Stage 3.1 Hotfix
The public landing gate now shows a dedicated Guardian / Student Login button that opens the phone + PIN portal. No SQL change is required beyond the already-installed Stage 3 migration.

#### Stage 3.4 hotfix — Guardian multi-student switcher
The guardian portal no longer relies on a native select control for sibling/student switching. When one guardian phone is linked to multiple students, each student appears as a direct selectable button, with the active student clearly highlighted. No SQL or schema change is required.


### Stage 3.5 — Automatic Family Linking Hotfix
- Enabling Guardian phone access for one student now links every active sibling with the same registered guardian phone.
- One guardian PIN/account is shared across those linked students.
- The Guardian portal student switcher now stays fully hidden for a single authorized student.
- No database migration is required for Stage 3.5.

## Stage 4 — Mobile Navigation & Back
Hardware/browser Back is now routed through app history. Modals and Mushaf overlays are dismissed first, then prior app screens are restored, with a double-Back exit guard on Home. No database change.
