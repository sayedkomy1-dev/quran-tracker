# We Live Quran v10.2.0 — Architecture Refactor (Stage 1)

- لا تغيير في Schema (يبقى 12).
- لا Migration لبيانات الطلاب أو الحصص.
- إضافة `ImamApp` runtime namespace وexplicit legacy override registry.
- فصل بيانات v10 الثابتة عن workflow/UI code.
- إزالة اعتماد v10 الجديد على accidental function-declaration override order لعدد 12 adapter.
- إضافة Architecture regression guards وService Worker caching للملفات الجديدة.
- Safe Multi-Device Sync وGoogle Auth دون تغيير وظيفي مقصود.
