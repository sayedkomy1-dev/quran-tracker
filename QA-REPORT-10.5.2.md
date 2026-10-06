# QA Report — v10.5.2

## Scope
Stage 1 فقط: Home workspace + collapsible Today list + Teacher Mushaf launcher.

## Safety
- Schema remains 12.
- No Supabase SQL changes.
- No student/session/task data migration.
- Safe Multi-Device Sync logic unchanged.

## Implemented
- «طلاب اليوم» له زر فتح/إغلاق واضح وحالته محفوظة في settings.
- الحالة الافتراضية مغلقة لتوفير مساحة على شاشة الهاتف.
- بطاقة «مصحف المحفظ» في الرئيسية بفتح سريع + تنزيل المصحف.
- «إدارة المصحف» ما زالت منفصلة لإعدادات Offline.
- فتح المصحف يحاول استخدام PDF المحلي المثبت أولًا، ثم المصدر الشبكي عند الاتصال.

## Automated checks
- `npm test`: PASS.
- `node --check` لجميع ملفات JavaScript الأساسية وميزات v10: PASS.
- Static regression guards الخاصة بـ v10.5.2: PASS.
- Recitation carry-forward regression checks: PASS.

## Deferred by design
- «أين توقفنا» الذكي: المرحلة 2.
- «اقتراح المراجعة» العملي: المرحلة 2.
- إبراز أزرار التقييم: المرحلة 3.
- 8 أرباع + الأحزاب والأسماء: المرحلة 4.
