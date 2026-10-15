-- v11.7.4.1 — isolated Quran guest practice and opt-in Google backup.
-- Additive ONLY. No updates to academy, guardian, student, session or finance tables.
create table if not exists public.quran_guest_practice (
  user_id uuid primary key references auth.users(id),
  display_name text not null default 'ضيف',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint guest_payload_json_object check (jsonb_typeof(payload)='object'),
  constraint guest_payload_limit check (octet_length(payload::text)<=64000),
  constraint guest_name_length check (char_length(display_name)<=80)
);
create index if not exists quran_guest_recent_idx on public.quran_guest_practice(last_seen_at desc);
alter table public.quran_guest_practice enable row level security;
revoke all on public.quran_guest_practice from public,anon,authenticated;
grant select,insert,update on public.quran_guest_practice to authenticated;
-- Signed-in guests may read/write only their own practice. A logged-in guest
-- is NOT an approved teacher and is NOT enrolled in any academy.
create policy guest_practice_read_own on public.quran_guest_practice
  for select to authenticated using(user_id=auth.uid());
create policy guest_practice_insert_own on public.quran_guest_practice
  for insert to authenticated with check(user_id=auth.uid());
create policy guest_practice_update_own on public.quran_guest_practice
  for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
-- Opt-in Google accounts ONLY. Anonymous local practice is intentionally
-- NOT trackable remotely and has no personal identity.
create or replace function public.quran_guest_usage_overview()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_result jsonb;
begin
  if not exists(select 1 from public.app_users u where u.user_id=auth.uid() and u.role='owner' and u.status='active')
    then raise exception 'PLATFORM_OWNER_REQUIRED'; end if;
  select jsonb_build_object('google_guests',(select count(*) from public.quran_guest_practice),
    'active_30d',(select count(*) from public.quran_guest_practice where last_seen_at>=now()-interval '30 days'),
    'recent',coalesce((select jsonb_agg(jsonb_build_object('name',g.display_name,'email',g.email,'last_seen',g.last_seen_at)) from
      (select gp.display_name, au.email, gp.last_seen_at from public.quran_guest_practice gp
       join auth.users au on au.id=gp.user_id order by gp.last_seen_at desc limit 20) g),'[]'::jsonb)) into v_result;
  return v_result;
end;
$$;
revoke all on function public.quran_guest_usage_overview() from public,anon,authenticated;
grant execute on function public.quran_guest_usage_overview() to authenticated;
