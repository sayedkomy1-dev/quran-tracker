## v10.10.0 — Stage 3 Guardian Phone Login + Secure PIN

- Added a public Guardian Login page using the phone number already registered on the student + a 6-digit PIN.
- Phone/PIN access is read-only and opens only students linked to that guardian account; siblings on the same guardian account can be selected from one session.
- Added teacher controls to activate/link phone access, reset the PIN, copy/open the public login page, send credentials through WhatsApp, and disable phone access per student.
- PINs are bcrypt-hashed in Supabase and never returned by SQL; Stage 3 stores only a deterministic phone lookup hash plus the final 4 digits, not the full phone number.
- Added failed-login throttling (8 failed attempts within 15 minutes → 15-minute lock) and opaque 12-hour guardian sessions.
- Guardian session tokens are captured from the URL fragment, moved into sessionStorage, then removed from the address bar; session URLs are not shareable from the portal UI.
- Phone/PIN snapshots refresh automatically after a saved session when the teacher is online; the optional Stage 2 direct-link active/revoked state is kept independent.
- Stage 1 snapshot links and Stage 2 live links remain available as optional sharing methods.
- Local application Schema remains 12; student/session/account-sync data structures are unchanged.
- New additive migration: `sql/guardian-portal-login.sql`.

## v10.10.0 — Stage 2.1 UI integration hotfix

- Made Guardian / Student Portal entry points permanent in the student profile, Guardian Communication Center, and More sheet.
- Added a read-only `ImamApp.State` bridge because top-level `let` state is not available through `globalThis`.
- Updated Guardian Portal to consume live students/sessions/settings/current student from that bridge.
- Bumped the PWA cache generation so the hotfix replaces the Stage 2 shell cleanly.
- No database/schema changes; the Stage 2 SQL remains unchanged.

## 10.10.0 — Guardian & Student Portal (Stage 2)
- Added stable per-student live guardian links that can be refreshed without changing the URL.
- Added explicit revoke; republishing after revoke rotates the token so the old link remains dead.
- Added portal link status, refresh-only action, and Stage 1 snapshot fallback.
- Live links expose only a random capability token in the URL fragment; phone and internal IDs remain excluded.
- Added an isolated `guardian_portal_shares` backend and tightly scoped RPCs; direct table access is revoked.
- Local Schema remains 12; students, sessions, and account sync are unchanged.

## 10.10.0 — Guardian & Student Portal (Stage 1)
- Added a standalone read-only guardian/student portal snapshot.
- Added portal entry points from student profile, More, and Guardian Communication Center.
- Added progress, attendance, current assignment, stabilization items, recent sessions, share, and print/PDF.
- Snapshot links exclude phone numbers and internal IDs and keep payload in the URL fragment.
- Schema remains 12 with no SQL or Supabase changes.

## 10.9.0 — Circle Analytics & Reports Center
- إضافة تحليلات على مستوى الحلقة مع فترات 7/30/90 يومًا أو كل الفترة.
- متوسط إتقان متوازن على مستوى الطالب، حضور، إعادات، وحجم الحفظ الجديد.
- اتجاهات تحسن/استقرار/تراجع وتوزيع التقييمات.
- تجميع أكثر المواضع احتياجًا للتثبيت حسب الفترة وعدد الطلاب المتأثرين.
- ترتيب الطلاب، فلترة حسب الحلقة، CSV، نسخ ملخص، وطباعة/PDF.
- Schema 12 دون SQL أو تغييرات Supabase.

# v10.8.0 — Teacher Follow-up Center

- Added a cross-student follow-up center that ranks active students using transparent 30-day signals.
- Added priority explanations for low mastery, repeats, low attendance, stabilization needs, declining trend, and delayed attendance.
- Added filters for high priority, low mastery, repeats, attendance, overdue follow-up, and missing numeric scores.
- Added group/search filters plus direct actions to open the student profile, start a session, or prepare a manual WhatsApp follow-up.
- Added a home follow-up card, header priority badge, and More-menu entry.
- Analytics are read-only over existing Schema 12 data; no SQL or Supabase migration required.

---

# v10.7.0 — Student Progress Dashboard

- Added a dedicated student progress tab with 30/90/all-time filters.
- Added teacher-entered mastery averages, attendance, repetitions and new-memorization KPIs.
- Added per-section mastery for new memorization, near review, far review and Surah/quarter review.
- Added a score trend chart and improvement/stability/decline indicator.
- Added current stabilization insights based on the latest result for each recent item.
- Added grade distribution and a manual WhatsApp progress-summary action.
- Analytics are read-only over existing Schema 12 data; no SQL migration required.

---

# v10.6.2 — Compact Guardian Report Polish

- Replaced large WhatsApp emoji progress blocks with compact text squares while preserving the exact teacher-entered `/100` score.
- Tightened vertical spacing between main assessment sections and item-level Surah / quarter-hizb rows.
- Kept section hierarchy, next assignment, automatic repeats, teacher notes, footer, and saved percentages unchanged.
- No schema, SQL, or Supabase changes.

# v10.6.1 — Sectioned Guardian Report + Teacher Scores

- Split the detailed guardian WhatsApp report into clear recitation, item-review, next-assignment, notes, and footer sections.
- Added teacher-entered 0–100 mastery percentage below each main recitation assessment.
- Added independent 0–100 percentage for every reviewed Surah / quarter-hizb item.
- Added a 10-block WhatsApp progress bar with the exact `/100` score under each scored assessment.
- Scores persist through drafts, saved-session edits, sync snapshots, and portable backup/import.
- Existing sessions remain compatible and never receive fabricated percentages.
- No schema, SQL, or Supabase changes.

# v10.6.0 — Guardian Communication Center

- Replaced the old bulk-message composer with a focused guardian communication center.
- Added report, absence, assignment reminder, and custom-message workflows.
- Added recipient scopes for today, today absentees, all active students, groups, and manual selection.
- Added WhatsApp number validation with explicit warnings and safe queue exclusion.
- Added per-student personalized preview and a manual one-by-one WhatsApp send queue.
- Reuses detailed session reports, carry-forward tasks, next assignments, and teacher notes.
- No schema, SQL, or Supabase changes.

# v10.5.11 — Prominent Recitation Assessment

- Five prominent assessment buttons across previous assignment and item-level review.
- Explicit `إعادة` action copies the same assignment forward automatically.
- `يحتاج متابعة` remains a non-passing assessment without automatic advancement.
- Repeat is preserved by backup/import and no longer counts as verified new memorization.
- No schema or SQL changes.

# v10.5.10 — Exact Mushaf Position + Explicit Insight Buttons

- `فتح الموضع في المصحف` now resolves the exact ayah page instead of only the Surah start page.
- Bundled the KFGQPC 6,236-ayah → 604-page navigation map for exact Offline page lookup.
- `أين توقفنا؟` now separates `آخر تسميع` from `التكليف القادم` so each opens its own correct Mushaf location.
- `أين توقفنا؟` and `اقتراح المراجعة` now use clear visible open/close buttons instead of arrow-only disclosure controls.
- Schema 12 unchanged; no SQL or Supabase migration.

# v10.5.8 — Mushaf Final Polish

- Full-pack download controls disappear after 604/604 pages are stored and the footer reflows without an empty slot.
- Surah/Juz drawers show only the KFGQPC calligraphic title plus number/page metadata; duplicate plain labels were removed.
- Search inputs no longer auto-focus on drawer open; the soft keyboard dismisses on list scrolling and navigation.
- Text fallbacks remain available if a calligraphic title asset fails.
- No SQL, Supabase, sync, or Schema 12 changes.

# v10.5.7 — KFGQPC Composite Mushaf

- حزمة تخزين جديدة للمصحف مع حذف آمن لحزمة الصفحات القديمة عند أول تشغيل.
- صفحتا الفاتحة وبداية البقرة من موارد تطبيق مصحف المدينة المفكك، مع نسخ ليلية.
- إطار مصحف المدينة الأصلي للصفحات 3–604 مع نص SVG الواضح.
- فهرس محلي لـ114 سورة و30 جزءًا.
- استخراج 240 ربع حزب (8 أرباع لكل جزء) من قاعدة بيانات المصحف.
- اختفاء زر التنزيل تلقائيًا عند اكتمال 604/604.
- لا SQL ولا تغيير في Schema 12.

# Changelog

## 10.5.6 — Madani Page Skin & Opening Pages
- Added local scalable ornamental assets for the Mushaf frame and Surah title cartouche.
- Added a decorative Surah title inside the page frame whenever the current page starts a Surah.
- Added dedicated opening-page treatments for page 1 (Al-Fatiha) and page 2 (Al-Baqarah).
- Refined day parchment, multi-line border, corner decoration, reader header/footer spacing, and mobile page area.
- Refined night treatment without changing stored Quran page data.
- New ornamental assets are precached by the service worker for offline reading.
- Schema 12, sync model, and Supabase remain unchanged.

## 10.5.5 — Teacher Mushaf Page-First Navigation
- Fixed unreadable night mode by keeping the Mushaf page on a dim parchment surface instead of inverting a transparent SVG.
- Rebuilt the reader chrome around the page: current Surah, current Juz, quick page jump, and a compact bottom bar.
- Added a searchable Surah drawer and a 30-Juz drawer with named Juz entries and standard Madani start pages.
- Current Surah/Juz are updated as pages turn; active entries are highlighted in the navigation drawers.
- Preserved RTL swipe behavior: swipe right for next page, left for previous page, with page-turn sound.
- Reworked the frame to a green/pink Madani-inspired motif while maximizing usable page area.
- Full-pack download action remains hidden after 604/604 pages are present.

## 10.5.4 — Premium Teacher Mushaf Reader
- عكس إيماءة التقليب للمصحف العربي: السحب لليمين ينتقل إلى الصفحة التالية، واليسار إلى السابقة.
- إضافة فهرس سور قابل للبحث والانتقال المباشر إلى بداية السورة، مع حفظ بيانات الفهرس محليًا للاستخدام Offline بعد تحميلها.
- إخفاء زر تنزيل المصحف نهائيًا من القارئ والرئيسية بمجرد اكتمال 604/604 صفحة، وإظهاره فقط عند وجود صفحات ناقصة.
- إضافة وضع قراءة ليلي محفوظ بين الجلسات، مع خلفية نهارية دافئة مريحة للعين.
- تطوير الإطار الزخرفي إلى إطار متعدد الطبقات بلمسات ذهبية وخضراء بدون صور خارجية.
- تحسين أزرار السابق/التالي وحالة السورة الحالية داخل القارئ.

## 10.5.3
- Home: Today’s Students is closed by default with a reliable switch-style toggle.
- Teacher Mushaf: page-based in-app reader only; no PDF opening/downloading path.
- Teacher Mushaf: swipe left/right, previous/next controls, page-turn sound, decorative frame.
- Offline pack: full-download button hides when all 604 pages are stored and shows resume state for partial packs.
- Storage: one-time cleanup of the obsolete full PDF and old experimental PDF page cache.

## 10.5.3 — Stage 1: Home Workspace + Teacher Mushaf
- جعل «طلاب اليوم» قائمة قابلة للفتح/الإغلاق مع حفظ الحالة، ومغلقة افتراضيًا لتقليل الزحام.
- إضافة بطاقة «مصحف المحفظ» في الرئيسية بفتح سريع للمصحف وزر تنزيل مستقل.
- فصل «فتح المصحف للمراجعة» عن «إدارة المصحف/Offline» حتى تظل الرئيسية عملية.
- لا تغيير في Schema 12 أو بيانات الطلاب أو Safe Multi-Device Sync.

# v10.5.1 — Smart Recitation & Carry Forward

- تقييم منفصل لكل سورة أو ربع جزء بدل التقييم الجماعي فقط.
- جزء كامل = 4 أرباع تعليمية مستقلة، مع إمكانية اختيار ربع واحد أو عدة أرباع.
- أي عنصر لم يُسمع أو يحتاج متابعة يُرحّل تلقائيًا إلى الحصة القادمة.
- دمج الإعادة مع التكليف الجديد مع منع التكرار.
- حفظ grade/status لكل عنصر في `reviewResults` لتاريخ المحاولات.
- تقرير WhatsApp يعرض التقييمات الفردية والإعادات التلقائية.
- لا تغيير في Schema 12 ولا SQL جديد.

# v10.5.0 — Guardian Report Upgrade

- تقرير واتساب أنظف وأكثر تحفيزًا لولي الأمر والطالب.
- تقييمات: ممتاز ⭐⭐⭐، جيد جدًا ⭐⭐، جيد ⭐، يحتاج متابعة 😕.
- ملاحظات المحفظ تظهر تلقائيًا إذا كانت مكتوبة.
- إزالة أيقونة التقويم التي كانت تظهر FEB 24 على بعض أجهزة Android.
- تحسين الرسالة المختصرة والتفصيلية مع الحفاظ على بيانات الحصة نفسها.

## 10.4.2
- إصلاح بقاء قارئ PDF القديم ظاهرًا على Android بعد 10.4.1.
- Cache-busting لأصول JS/CSS وتغيير استراتيجية SW للكود إلى network-first.
- Bridge صريح من v9 إلى قارئ صفحات SVG الجديد في صفحة المصحف وداخل شاشة التلقين.

# v10.4.0 — Lightweight Mushaf Offline

- Added optional page-by-page Madani Mushaf offline cache (604 vector PDF pages).
- Added single-page, memorization-range and full-pack downloads with stop/resume-by-skip behavior.
- Added lightweight page reader and actual local size/page count.
- Kept existing full-PDF import path unchanged.
- Added explicit source-trust disclosure: quran.ws is an independent mirror; KFGQPC remains the official reference.
- No database schema change (Schema 12).

# Changelog

## v10.4.0 — Quran UX & Performance Hotfix
- القرآن أصبح أولوية بصريًا داخل نافذة التلقين مع مساحة ثابتة ومقروءة للنص على الهاتف.
- إعادة تصميم أزرار التشغيل والإيقاف والتنزيل إلى أزرار مدمجة ومتناسقة.
- ضغط إعدادات التكرار والتلقين إلى شبكة ثنائية على الهاتف بدل التكديس الرأسي الطويل.
- قسم الصوت Offline أصبح قابلًا للطي لتقليل التشتيت.
- اختيار الآية أصبح أخف؛ لم يعد يعيد فحص جميع الآيات في كل لمسة.
- إعدادات القرآن تُحفظ في الخلفية دون تشغيل مسار Auto Sync الثقيل مع كل تغيير.
- فتح نافذة القرآن يعرض الواجهة فورًا أثناء جلب النص بدل انتظار اكتمال التحميل.
- إلغاء التمرير السلس أثناء تقدم الصوت لتقليل الإحساس باللاج.

## v10.3.0 — Quran Teaching Engine
- Flexible manual ayah repetition, full-range repetition, and tutoring pause in seconds.
- Added Minshawy and Maher Al-Muaiqly reciters plus teaching recitations.
- Tap-to-select ayah playback.
- Per-surah encrypted-account-independent local Offline audio packs in IndexedDB.
- No schema or Supabase changes.

## v10.2.0 — Architecture Refactor (Stage 1)
- إضافة `ImamApp` namespace وLegacy override registry صريح.
- فصل V10 static data إلى `js/features/v10-data.js`.
- تحويل 12 override في v10 من implicit duplicate declarations إلى explicit compatibility adapters.
- تحديث Service Worker والاختبارات للهيكل الجديد، بدون تغيير Schema أو البيانات.

# v10.1.5 — UI Polish

- إصلاح طبقة «المزيد» التي كانت تظهر خلف الشريط الجانبي على الكمبيوتر.
- تحسين بطاقات الأدوات والأيقونات والأزرار والتباعد والاستجابة للموبايل والكمبيوتر.
- لا تغيير في Schema أو Supabase أو منطق المزامنة الآمنة.

# v10.1.4 — Safe Multi-Device Sync

- إضافة `sync-core.js` كطبقة pure logic لدمج السجلات وTombstones بصورة deterministic.
- تسجيل حذف الطلاب/الحصص/المهام التابعة وحذف المهام كـTombstones بدل اختفاء الحذف من تاريخ المزامنة.
- إضافة `deviceId`, `updatedByDevice`, `syncProtocol: 2` و`sourceDeviceId`.
- تحويل المزامنة إلى Pull/Merge قبل كل Push.
- إضافة `revision` إلى `account_sync` وRPCs جديدة `account_sync_pull_v2` / `account_sync_push_v2`.
- Compare-And-Swap + Retry يمنع Lost Update بين جهازين.
- تعطيل RPCs القديمة Last-Write-Wins للمستخدمين authenticated.
- Auto Sync يُطفأ مرة واحدة عند ترقية بروتوكول المزامنة ثم يمكن تفعيله بعد اختبار جهازين.
- Schema يبقى 12.

# v10.1.3 — Account Ownership & Cloud Backup

- عزل البيانات المحلية حسب حساب Google (`auth.uid`).
- Wizard لربط بيانات ما قبل تسجيل الدخول بالحساب الصحيح بدون حذف Legacy snapshot.
- عزل مسودات الحصص والنسخ التلقائية بين الحسابات على نفس الجهاز.
- مزامنة سحابية جديدة تعتمد على حساب المستخدم بدل Sync ID/Access Secret.
- البيانات السحابية تبقى مشفرة AES-GCM محليًا، وكلمة التشفير لا تُرسل إلى Supabase.
- إضافة `account_sync` وRPCs مملوكة للحساب.
- Schema يبقى 12.

# v10.1.2 — Google Login & Access Control

- ربط Google OAuth عبر Supabase Auth بمشروع `We Live Quran`.
- Gate قبل تحميل بيانات التطبيق: لا يتم تهيئة IndexedDB/الواجهة للمستخدم غير المصرح له.
- Owner تلقائي للحساب `info.welivequran@gmail.com`؛ الحسابات الجديدة تبدأ Pending.
- لوحة Owner لتفعيل/إيقاف المستخدمين باستخدام RLS server-side.
- Trusted Device يسمح بالعمل Local-First عند انقطاع الشبكة بعد تحقق ناجح سابق.
- Cloud Sync يستعمل Bearer access token للمستخدم authenticated بدل التعامل مع Publishable key كهوية.
- RPC للمزامنة مقيدة بـ`auth.uid()` ومالك السجل، ولا تمنح `anon` حق التنفيذ.
- إضافة Privacy Policy وTerms of Service وروابط OAuth القانونية.
- تحديث Service Worker إلى `quran-pwa-v10.1.2`.
- Schema التطبيق ما زال 12؛ لا Migration لبيانات الطلاب أو الحصص.

# v10.1.1 — Security & Stabilization

- فصل Portable Backup عن النسخ المحلية: ملفات JSON المشاركة/المنزلة لا تتضمن PIN hashes/salts أو WebAuthn credential ID أو مفاتيح/كلمات/أسرار المزامنة.
- الحفاظ على Internal Auto Backup للاستعادة على نفس الجهاز مع إبقاء أسرار الجهاز محلية.
- تأمين Supabase Sync: إلغاء سياسات `anon using(true)` ومنع الوصول المباشر للجدول، واستخدام RPC مع Sync ID عالي entropy وسر وصول مستقل.
- إضافة زر لتوليد Sync ID وSync authorization secret قويين محليًا.
- إبقاء AES-GCM/PBKDF2 لتشفير payload منفصلًا عن authorization secret.
- توحيد Version/Service Worker/Documentation على 10.1.1 مع Schema 12 دون Migration.

# v10.0.0 — Clean PWA / item-level review

- مراجعة الأجزاء والمجموعات أصبحت على مستوى السورة (`completed/repeat/not_heard`).
- «نفس التكليف» عند الضعف أصبح قرارًا صريحًا للمحفظ.
- إضافة Accordion لسجل الأخطاء واقتراح المراجعة وحفظ حالتهما في المسودة.
- زر النص داخل تسميع الحصة السابقة.
- Facebook Setting وTheme architecture وPWA cache v10.
- تأسيس مكتبة الحديث/الأذكار وربطها بالطلاب دون توليد محتوى شرعي غير موثق.

# v9.2.2 — GitHub-ready stabilization

- دمج حزمة المشروع الكاملة مع `branding/`, `screenshots/`, `sql/`, الاختبارات والتوثيق بدل الحزمة المختصرة.
- حساب تعارضات المواعيد للطلاب النشطين فقط.
- إضافة إعادة تنشيط فردية وجماعية للطلاب المتوقفين/المؤرشفين.
- تقوية PIN إلى PBKDF2-SHA256 + Salt + 250,000 iterations مع ترقية شفافة من SHA-256 القديم ومحاولات محدودة.
- تنظيف Voice Notes المحلية عند حذف الطالب وفحص الملفات الصوتية المفقودة/اليتيمة في Data Health.
- فشل آمن لربط موضع الحفظ بصفحة المصحف؛ لا فتح افتراضي للصفحة 1 عند الخطأ.
- إزالة `timeupdate` من Mini Player لتجنب إعادة بناء DOM غير الضرورية.
- توجيه الرئيسية إلى الحصة التالية/المتأخرة مباشرة وتحسين Accessibility لمسار الحصة.
- تحسين Service Worker: precache متسامح مع فشل أصل واحد + حد Runtime Cache.
- تحديث اختبارات الإصدار لتغطي الإصلاحات الجديدة وحضور أصول المشروع الكاملة.

# v9.2.1 — Session UI hotfix

- إزالة Action Dock العائم الذي كان يغطي محتوى الحصة على الهاتف.
- نقل حفظ/تحديث الحصة والإرسال لولي الأمر إلى نهاية الحصة مرة واحدة فقط.
- إخفاء إجراءات إنهاء الحصة في الوضع المبسط حتى خطوة الملاحظات.
- تحديث Service Worker إلى cache مستقل v9.2.1.

# سجل التغييرات

## 9.1.0 — 2026-09-15

### إصلاحات حرجة
- إصلاح Regression كان يخفي أزرار **حفظ الحصة** و**حفظ وإرسال لولي الأمر** وخيارات الرسالة في CSS الخاص بـv9.
- الإبقاء على أزرار الحفظ والإرسال الأصلية نفسها ونقلها إلى Action Dock ثابت بدل إنشاء بدائل منفصلة.
- إصلاح تجربة الترقية حتى لا يدخل المستخدم القديم تلقائيًا في وضع مبسط يخفي أقسامًا اعتاد عليها؛ المستخدم الحالي يبدأ في الوضع السريع الكامل.
- إزالة إعادة تعريف `save()` و`migrateV8Data()` من v9 لتقليل مخاطر recursion والتداخل أثناء الإقلاع.
- جعل تهيئة v9 Fail‑Soft: تعطل وحدة فرعية لا يمنع الوظائف الأساسية من العمل.
- إضافة Fallback للتنقل القديم؛ لا يتم إخفاؤه إلا بعد نجاح تهيئة شريط v9.
- عدم إخفاء الصفحة الرئيسية القديمة إلا بعد نجاح بناء Command Center فعليًا.
- عدم وضع شاشة الحصة في حالة `v9-ready` إلا بعد اكتمال تهيئتها.
- تحديث Service Worker إلى Cache مستقل وتفعيل التحديث فورًا فوق نسخة v9 المعطوبة.

### التحقق والجودة
- فحص Syntax لـ `app.js`, `v8.js`, `v9.js`, `sw.js`.
- فحص عدم وجود IDs مكررة أو ملفات محلية مفقودة أو Inline handlers بلا دوال.
- Regression guards تمنع إخفاء أزرار الحفظ والإرسال مستقبلًا.
- Smoke Tests فعلية على Chromium للهاتف وWindows تشمل: التنقل، الحفظ، حفظ+إرسال، الرسالة المختصرة/التفصيلية، الطلاب، الملف، الحضور، التقارير، الإعدادات، المصحف والبحث.

## 9.0.0 — 2026-09-14

### UX/UI
- إعادة بناء الواجهة كـ Command Center هادئ بدل تكديس البطاقات.
- Bottom Navigation جديد للهاتف وSidebar مخصص لسطح المكتب.
- Design System أخضر/ذهبي موحد مع SVG Icons وFocus states ومساحات لمس أفضل.
- دعم الوضع المبسط والوضع السريع في شاشة الحصة.
- Onboarding لأول تشغيل وDemo Mode.

### الطلاب والحصة
- حالات نشط/متوقف/مؤرشف وتثبيت الطالب أعلى القائمة.
- Bulk Actions ورسائل جماعية ومجموعات أسرع.
- قائمة سياقية بالزر الأيمن على Windows.
- تحويل الحصة إلى 4 خطوات: التسميع، الحفظ، المراجعة، الملاحظات.
- إضافة Steppers لأرقام الآيات وشريط إجراءات ثابت.
- تنظيم ملف الطالب إلى الخطة/السجل/التحليل.
- زر «حضر الجميع» للحضور السريع.

### القرآن والمصحف
- ترقية «النص» إلى Quran Focus مع تبويب النص وصفحة المصحف.
- تكرار الآية، السرعة، وضع التلقين، إعادة النطاق، وMini Player.
- إضافة صفحة «المصحف» ومصدر رسمي لمصحف المدينة برواية حفص.
- دعم تثبيت PDF محليًا، القراءة Offline، آخر صفحة، العلامات، وضع صفحة/صفحتين، وملء الشاشة.
- ربط نطاق الحفظ برقم صفحة المصحف تلقائيًا.
- إضافة تنزيل كامل للنص القرآني إلى IndexedDB للعمل دون إنترنت.

### البيانات والتوافق
- Schema Version = **11**.
- إضافة `studentStatus` و`pinned` للطلاب مع Migration تلقائي.
- إضافة إعدادات v9 مع الحفاظ على إعدادات v8 والمزامنة والأمان.
- تحديث Service Worker وApp Shell ليشمل `v9.js` و`v9.css`.

## 8.0.0 — 2026-09-14

### رحلة الحصة
- إضافة وضع الحصة السريع مع شريط انتقال بين التسميع والأخطاء والحفظ والمراجعات والملاحظات.
- فصل «آخر ما تم تسميعه» عن «التكليف القادم» في شاشة الحصة وملف الطالب.
- إضافة خيار للطالب: الاستكمال من آخر آية للربط أو من الآية التالية.
- الإبقاء على اتجاه مستقل ↑/↓ لكل من الحفظ، المراجعة القريبة، البعيدة، الأجزاء، والسور.
- إضافة أزرار «تمت السورة» و«كرر نفس التكليف».
- إضافة خطط: متوازنة، مبتدئ، حفظ مكثف، مراجعة فقط، ختمة تثبيت، قصار السور.

### المراجعة والمتابعة
- إضافة محرك مراجعة متباعدة يعتمد على تقييمات التسميع السابقة.
- إضافة سجل أخطاء: حفظ، تردد، تلقين، تجويد، تشكيل، نسيان آية.
- إضافة خريطة تقدم السور بدون نسب مئوية وحالات: محفوظ/جارٍ/يحتاج مراجعة/لم يبدأ.
- إضافة Timeline للطالب وبطاقة «أين توقفنا؟».
- إضافة أهداف أسبوعية عددية في الرئيسية.
- تحسين البحث في أسماء السور والتحقق من أرقام الآيات حسب عدد آيات السورة.

### النص القرآني والصوت
- إضافة زر «النص» بجوار الحفظ الجديد فقط.
- عرض نطاق الآيات بالرسم العثماني/QPC Hafs مع خط Uthmanic Hafs.
- إضافة تشغيل آية-آية للقارئين محمود خليل الحصري ومشاري راشد العفاسي فقط.
- تخزين نص السور التي تم تحميلها في IndexedDB لتقليل الطلبات.

### الإنتاجية والتواصل
- إضافة ملاحظات صوتية محلية حتى 30 ثانية.
- إضافة قوالب ملاحظات سريعة.
- إضافة رسالتي واتساب: مختصرة وتفصيلية، مع الأخطاء والتكليف والتوقيع المؤسسي.
- إضافة تقرير شهري مخصص للطباعة/الحفظ PDF.

### الأمان والنسخ الاحتياطي والمزامنة
- إضافة قفل PIN محلي.
- إضافة WebAuthn للبصمة/Windows Hello عند توفر HTTPS والدعم.
- إضافة آخر 5 Backups تلقائية محلية مع الاستعادة.
- إضافة مزامنة اختيارية مشفرة AES-GCM عبر Supabase مع PBKDF2، وملف SQL للإعداد.
- عدم رفع PIN أو بيانات اعتماد WebAuthn إلى السحابة.
- رفع Schema Version إلى **10**.
- تحديث Service Worker وCache إلى v8.0.0 وإضافة `v8.js` إلى App Shell.

## 7.1.0 — 2026-09-14

### الهوية والواجهة الرئيسية
- اعتماد شعار أكاديمية الإمام المرفق كأيقونة التطبيق وFavicon وأيقونات PWA بمقاسات 96 و192 و512 وMaskable.
- نقل الإحصائيات والتحليل المبسط إلى أعلى الصفحة الرئيسية.
- إزالة بطاقتي «الحصة التالية» و«يحتاج متابعة» من الصفحة الرئيسية لتقليل الزحام.
- عرض تحليل مختصر: حضور وغياب آخر 7 أيام، متوسط التسميع، وآيات الحفظ الجديد خلال الشهر.

### الحصة والتسميع
- إلغاء التقييم من حقول التكليف الجديد؛ التقييم أصبح حصرياً داخل قسم «تسميع الحصة السابقة».
- إزالة النسب المئوية من واجهات الطلاب والتقارير والشهادات ورسائل المتابعة، واستبدالها بقيم مباشرة مفهومة.
- تحويل اختيار السورة في الحفظ الجديد والمراجعة القريبة والبعيدة إلى قائمة قابلة للبحث والكتابة.
- إضافة اتجاه متابعة مستقل ↑/↓ لكل نوع من الحفظ والمراجعات.
- إضافة الاستكمال الذكي بعد تقييم «ممتاز / جيد جداً / جيد»: يستمر من آخر آية تم تسميعها، ويترك آية النهاية للمحفظ مع بقاء كل الحقول قابلة للتعديل.
- عند بلوغ نهاية السورة ينتقل الاقتراح إلى السورة السابقة أو التالية بحسب سهم الاتجاه المختار.

### مراجعة الأجزاء والسور
- فصل «مراجعة الأجزاء» و«مراجعة السور» إلى قسمين مستقلين، لكل منهما مفتاح تشغيل/إيقاف واتجاه متابعة خاص به.
- تسمية الأجزاء بأسمائها المتداولة مثل «جزء قد سمع»، «جزء تبارك»، «جزء عمّ» بدلاً من الأرقام.
- Migration آمن للسجلات القديمة التي كانت تجمع الأجزاء والسور في حقل واحد.

### واتساب والبيانات
- إضافة توقيع ثابت لرسائل المتابعة باسم «أكاديمية الإمام لتحفيظ القرآن الكريم» وشعار «بالقرآن نحيا».
- إضافة متغيري القالب `{{مستوى_التسميع}}` و`{{إجمالي_الآيات}}` مع إبقاء المتغيرات القديمة متوافقة دون إظهار نسب مئوية.
- رفع Schema Version إلى **9**.
- تحديث Service Worker وCache إلى v7.1.0.

## 7.0.0 — 2026-09-14

### Android وWindows
- تحويل تجربة الهاتف إلى Bottom Navigation مع Safe Area وBottom Sheets ومساحات لمس أكبر.
- إضافة Desktop Sidebar ومساحة عمل عريضة على Windows.
- إضافة `display_override` و`window-controls-overlay` و`launch_handler` إلى Manifest.
- إضافة screenshots للهاتف وWindows إلى Manifest لتحسين شاشة تثبيت PWA في المتصفحات الداعمة.
- دعم اختصارات لوحة المفاتيح للبحث والتنقل والحفظ السريع.
- احترام `prefers-reduced-motion` وتحسين rendering للقوائم الطويلة.

### مركز اليوم والمتابعة
- إضافة مركز اليوم الذكي مع الحصة التالية وإجراءات سريعة.
- إضافة قائمة «يحتاج متابعة» اعتماداً على آخر حصة، متوسط التسميع، الغياب والمهام المفتوحة.
- إضافة Badges للمهام في Header والرئيسية.

### المهام
- إضافة Tasks محلية مع Student linkage وDue date وPriority وحالة Done.
- فلاتر مفتوحة / اليوم / متأخرة / مكتملة / الكل.
- دعم المهام داخل Backup/Migration/Health Check.

### الطلاب والمجموعات
- إضافة Group / حلقة لكل طالب.
- البحث داخل المجموعة وفلترة قائمة الطلاب حسب المجموعة.
- عرض المجموعة في بطاقة الطالب وملفه.

### البحث والإنتاجية
- إضافة Command Palette للبحث في الطلاب والمهام والصفحات.
- `Ctrl/⌘ + K` للبحث، `Ctrl/⌘ + N` لطالب جديد، `Ctrl/⌘ + Enter` لحفظ الحصة، و`Alt + 1…6` للتنقل.

### التخزين والنسخ الاحتياطي
- Schema Version = 8.
- إضافة Persistent Storage request ودليل حالة التخزين في الإعدادات.
- إضافة Web Share للنسخة الاحتياطية مع fallback للتنزيل.
- تحديث Service Worker إلى v7 مع Navigation Preload وتنظيف Cache قديم.


## 6.2.0 — 2026-09-13

### الحصة والتسميع
- إضافة حقول سورة قابلة للكتابة والاختيار من قائمة مقترحات.
- اقتراح اسم السورة تلقائياً من آخر تكليف للطالب، مع إمكانية التعديل اليدوي.
- إضافة تسجيل «ما تم تسميعه فعلياً» للحفظ والمراجعة القريبة والبعيدة.
- دعم حالة أن يسمّع الطالب أكثر من المقدار المحدد، مع حساب الزيادة وعرضها فورياً.
- اعتماد النطاق الفعلي في حساب التقدم الموثق للطالب.

### مراجعة السور
- استبدال الاختيار المتتابع للسور بقائمة اختيار متعدد.
- إضافة البحث داخل السور وعدّاد للسور المحددة.
- إضافة اختيار سريع لسور جزء عم ومسح تحديد السور مع الإبقاء على الأجزاء المختارة.

### واتساب والتواصل
- إضافة مركز رسالة جماعية لجميع أولياء الأمور أو مجموعة محددة.
- إضافة قوالب جاهزة: عامة، تغيير موعد، إجازة، تهنئة، إعلان كورس، تذكير.
- الإرسال يتم على هيئة قائمة متتابعة حتى لا يمنع المتصفح النوافذ المتعددة.
- إضافة نسبة مستوى الحفظ ونسبة الإنجاز الموثق إلى رسالة المتابعة.
- إضافة متغيرات `{{نسبة_الحفظ}}` و`{{نسبة_الإنجاز}}` إلى قالب واتساب.

### الهوية وتجربة الاستخدام
- اعتماد اسم «أكاديمية الإمام لتحفيظ القرآن الكريم — بالقرآن نحيا» في Manifest والشاشة الافتتاحية.
- تصميم أيقونات جديدة للأكاديمية وMaskable Icon جديدة.
- تحديث App Version إلى 6.2.0 وSchema Version إلى 7.


## 6.0.0 — 2026-09-13

### إصلاحات حرجة

- منع إنشاء حصة ثانية لنفس الطالب في اليوم نفسه عند الانتقال بين الحضور والحصة.
- توحيد منطق حفظ الحصة إلى تحديث السجل الموجود عند وجوده.
- إصلاح احتساب الإجازة كغياب في بعض الإحصاءات.
- إصلاح حساب أيام النشاط المتواصل.
- إصلاح ترتيب رسالة Streak الخاصة بالشهر/الأسبوع.
- إصلاح طباعة التقرير والشهادة بعد تعارض قواعد `@media print` القديمة.
- إصلاح تغيير المظهر من صفحة التقارير.
- إصلاح فتح واتساب بعد الحفظ لتقليل حظر Popup.
- إصلاح Service Worker الذي كان يحاول تخزين أيقونات غير موجودة.

### نموذج البيانات

- Schema Version = 6.
- إضافة `sessionDate`, `createdAt`, `updatedAt`, `source`, `completed` إلى مسار الحصص عند الترقية.
- إضافة `prevGrades` كتقييم مستقل للتسميع السابق.
- إزالة سجلات الحضور الفارغة المكررة بأمان عند وجود جلسة مفصلة واحدة لنفس الطالب واليوم.
- الإبقاء على الجلسات المفصلة المتعددة القديمة وعدم حذفها تلقائياً حتى لا تضيع بيانات حقيقية.

### التقدم والتقييم

- دمج نطاقات الآيات المتداخلة والمتجاورة عند الحساب.
- فصل التكليف الجديد عن التقدم الذي تم تسميعه وتقييمه.
- الاعتماد على تقييم التسميع الحقيقي في المتوسطات والرسوم والتقارير وتحليل الضعف.
- تصحيح نسبة الحضور لتستبعد الإجازة من مقام الحضور/الغياب.

### الجدول الأسبوعي

- إضافة أيام الحصة ووقتها ومدتها لكل طالب.
- ترتيب «متابعة اليوم» حسب الموعد.
- إظهار الطلاب المجدولين لليوم في لوحة المتابعة.
- اكتشاف تعارضات الأوقات قبل حفظ الطالب.
- إضافة فحص تعارضات الجدول إلى «فحص سلامة البيانات».

### PWA وOffline

- إزالة Dexie وChart.js واعتمادات CDN بالكامل.
- استخدام IndexedDB الأصلي مع localStorage كنسخة أمان.
- رسوم Canvas داخلية للحضور والتقييم والنشاط الأسبوعي.
- إضافة أيقونة 96px وMaskable Icon وfavicon.
- إضافة تدفق Update Banner لتفعيل Service Worker الجديد.
- تحسين Manifest والاختصارات.

### الحماية والنسخ الاحتياطي

- Backup JSON يحتوي App Version وSchema Version وتاريخ التصدير.
- فحص بنية الملف وحجمه قبل الاستيراد.
- تنظيف IDs والحقول المستوردة وإعادة ربط جلسات الطلاب بأمان.
- Rollback للبيانات الحالية إذا فشل الاستيراد أثناء التنفيذ.
- فحص للأيتام والتكرار والنطاقات وأرقام واتساب والمسودات وتعارضات الجدول.

### تجربة الاستخدام

- Autosave لمسودة الحصة واستعادتها.
- شاشة «متابعة اليوم» وحالة الإنجاز.
- فصل عبارة «آيات كُلِّف بها» عن «آيات تم تسميعها وتقييمها».
- دعم Dark Mode مع إعادة رسم الرسوم محلياً.
- السماح بتكبير الصفحة بدلاً من تعطيل Zoom على الهاتف.

## 10.1.0 — Runtime UX hardening
- Made all visible v9.2 home content sections collapsible with persisted open/closed state.
- Fixed Surah combobox arrow close/reopen race, stale blur race, touch selection, ARIA wiring, and adaptive up/down placement.
- Corrected the 30 Juz-to-Surah intersection map used by item-level review expansion.
- Corrected the starter mercy hadith reference to Sahih al-Bukhari 6013.
- Connected v10 palette selection to the visible v9.2 shell theme tokens.

## 10.4.1 — Mushaf Mobile Reader Fix
- Fixed Android PDF placeholder problem by switching the page reader to SVG.
- Made the lightweight page reader the primary Mushaf experience.
- Added gzip-compressed local SVG page storage and legacy PDF cleanup controls.

### v10.10.0 Stage 3.1 Hotfix
- Added a visible **Guardian / Student Login** entry on the logged-out landing screen.
- Teacher Google login remains unchanged.
- Bumped the PWA cache generation so deployed clients receive the corrected auth screen.
