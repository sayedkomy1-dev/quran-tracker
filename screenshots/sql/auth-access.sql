-- We Live Quran v10.1.2 — Google Auth access control
-- ─────────────────────────────────────────────────────────────
-- 1) APPLICATION ACCESS CONTROL
-- ─────────────────────────────────────────────────────────────
create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'teacher' check (role in ('owner','teacher')),
  status text not null default 'pending' check (status in ('pending','active','blocked')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

alter table public.app_users enable row level security;
revoke all on table public.app_users from anon;
revoke all on table public.app_users from authenticated;
grant select on table public.app_users to authenticated;
grant update (role,status,approved_at) on table public.app_users to authenticated;

create or replace function public.is_app_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users u
    where u.user_id = auth.uid()
      and u.role = 'owner'
      and u.status = 'active'
  );
$$;

revoke all on function public.is_app_owner() from public;
grant execute on function public.is_app_owner() to authenticated;

drop policy if exists "app_users_select_self_or_owner" on public.app_users;
create policy "app_users_select_self_or_owner"
on public.app_users
for select
to authenticated
using (user_id = auth.uid() or public.is_app_owner());

drop policy if exists "app_users_owner_update" on public.app_users;
create policy "app_users_owner_update"
on public.app_users
for update
to authenticated
using (public.is_app_owner())
with check (
  public.is_app_owner()
  and role in ('owner','teacher')
  and status in ('pending','active','blocked')
);

create or replace function public.handle_new_app_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email,''));
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''),'@',1));
  v_is_owner boolean := lower(coalesce(new.email,'')) = 'info.welivequran@gmail.com';
begin
  insert into public.app_users(user_id,email,display_name,role,status,created_at,approved_at)
  values(
    new.id,
    v_email,
    v_name,
    case when v_is_owner then 'owner' else 'teacher' end,
    case when v_is_owner then 'active' else 'pending' end,
    now(),
    case when v_is_owner then now() else null end
  )
  on conflict (user_id) do update
    set email=excluded.email,
        display_name=case when public.app_users.display_name='' then excluded.display_name else public.app_users.display_name end;
  return new;
end;
$$;

revoke all on function public.handle_new_app_user() from public;

drop trigger if exists on_auth_user_created_wlq on auth.users;
create trigger on_auth_user_created_wlq
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.handle_new_app_user();

-- Backfill any users that may already have logged in before this SQL was run.
insert into public.app_users(user_id,email,display_name,role,status,created_at,approved_at)
select
  u.id,
  lower(coalesce(u.email,'')),
  coalesce(u.raw_user_meta_data->>'full_name',u.raw_user_meta_data->>'name',split_part(coalesce(u.email,''),'@',1)),
  case when lower(coalesce(u.email,''))='info.welivequran@gmail.com' then 'owner' else 'teacher' end,
  case when lower(coalesce(u.email,''))='info.welivequran@gmail.com' then 'active' else 'pending' end,
  coalesce(u.created_at,now()),
  case when lower(coalesce(u.email,''))='info.welivequran@gmail.com' then now() else null end
from auth.users u
on conflict (user_id) do update
set email=excluded.email,
    role=case when excluded.email='info.welivequran@gmail.com' then 'owner' else public.app_users.role end,
    status=case when excluded.email='info.welivequran@gmail.com' then 'active' else public.app_users.status end,
    approved_at=case when excluded.email='info.welivequran@gmail.com' then coalesce(public.app_users.approved_at,now()) else public.app_users.approved_at end;

