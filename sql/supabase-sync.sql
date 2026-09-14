-- أكاديمية الإمام v8.0 — جدول المزامنة المشفرة الاختيارية
-- نفّذ هذا الملف مرة واحدة في Supabase SQL Editor.
-- البيانات داخل payload مشفرة في المتصفح بـ AES-GCM قبل الرفع.

create table if not exists public.imam_sync (
  sync_id text primary key,
  payload text not null,
  updated_at timestamptz not null default now()
);

alter table public.imam_sync enable row level security;

-- PWA ثابت لا يملك تسجيل دخول؛ لذلك يحتاج publishable/anon role إلى الوصول للصفوف.
-- لا تضع بيانات نصية في هذا الجدول: التطبيق يرسل payload مشفرًا فقط.
drop policy if exists "imam_sync_select" on public.imam_sync;
create policy "imam_sync_select" on public.imam_sync
for select to anon using (true);

drop policy if exists "imam_sync_insert" on public.imam_sync;
create policy "imam_sync_insert" on public.imam_sync
for insert to anon with check (true);

drop policy if exists "imam_sync_update" on public.imam_sync;
create policy "imam_sync_update" on public.imam_sync
for update to anon using (true) with check (true);

-- اختياري: إزالة النسخ القديمة غير المستخدمة يدويًا من لوحة Supabase.
