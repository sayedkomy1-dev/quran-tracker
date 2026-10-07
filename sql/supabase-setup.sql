-- We Live Quran v10.1.4 — complete Supabase setup
-- Run once in Supabase SQL Editor for project svtcntalwfmexthcnvqe.
-- This creates access-control records for Google users and authenticated encrypted sync.
-- It never requires a service_role key in the browser.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

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

-- ─────────────────────────────────────────────────────────────
-- 2) ENCRYPTED CLOUD SYNC, SCOPED TO THE AUTHENTICATED USER
-- ─────────────────────────────────────────────────────────────
create table if not exists public.imam_sync (
  sync_id text primary key,
  owner_user_id uuid references auth.users(id) on delete cascade,
  payload text not null,
  auth_hash text,
  updated_at timestamptz not null default now()
);

alter table public.imam_sync add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
alter table public.imam_sync add column if not exists auth_hash text;
alter table public.imam_sync enable row level security;

drop policy if exists "imam_sync_select" on public.imam_sync;
drop policy if exists "imam_sync_insert" on public.imam_sync;
drop policy if exists "imam_sync_update" on public.imam_sync;
drop policy if exists "imam_sync_delete" on public.imam_sync;
revoke all on table public.imam_sync from anon, authenticated;

create or replace function public.imam_sync_push(
  p_sync_id text,
  p_auth_secret text,
  p_payload text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_existing_hash text;
  v_existing_owner uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_sync_id is null or length(p_sync_id) < 20 or length(p_sync_id) > 180 then raise exception 'INVALID_SYNC_ID'; end if;
  if p_auth_secret is null or length(p_auth_secret) < 24 or length(p_auth_secret) > 512 then raise exception 'INVALID_AUTH_SECRET'; end if;
  if p_payload is null or length(p_payload) < 20 or length(p_payload) > 50000000 then raise exception 'INVALID_PAYLOAD'; end if;

  select s.auth_hash,s.owner_user_id into v_existing_hash,v_existing_owner
  from public.imam_sync s where s.sync_id=p_sync_id for update;

  if not found then
    insert into public.imam_sync(sync_id,owner_user_id,payload,auth_hash,updated_at)
    values(p_sync_id,v_uid,p_payload,crypt(p_auth_secret,gen_salt('bf',12)),now());
    return jsonb_build_object('ok',true,'created',true);
  end if;

  if v_existing_owner is distinct from v_uid then raise exception 'SYNC_ACCESS_DENIED'; end if;
  if v_existing_hash is null then raise exception 'LEGACY_ROW_REQUIRES_RESET'; end if;
  if crypt(p_auth_secret,v_existing_hash) <> v_existing_hash then raise exception 'SYNC_ACCESS_DENIED'; end if;

  update public.imam_sync set payload=p_payload,updated_at=now() where sync_id=p_sync_id and owner_user_id=v_uid;
  return jsonb_build_object('ok',true,'created',false);
end;
$$;

create or replace function public.imam_sync_pull(
  p_sync_id text,
  p_auth_secret text
)
returns table(payload text,updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_existing_hash text;
  v_existing_owner uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_sync_id is null or length(p_sync_id)<20 or length(p_sync_id)>180 then raise exception 'INVALID_SYNC_ID'; end if;
  if p_auth_secret is null or length(p_auth_secret)<24 or length(p_auth_secret)>512 then raise exception 'INVALID_AUTH_SECRET'; end if;

  select s.auth_hash,s.owner_user_id into v_existing_hash,v_existing_owner
  from public.imam_sync s where s.sync_id=p_sync_id;
  if not found then return; end if;
  if v_existing_owner is distinct from v_uid then raise exception 'SYNC_ACCESS_DENIED'; end if;
  if v_existing_hash is null then raise exception 'LEGACY_ROW_REQUIRES_RESET'; end if;
  if crypt(p_auth_secret,v_existing_hash) <> v_existing_hash then raise exception 'SYNC_ACCESS_DENIED'; end if;

  return query select s.payload,s.updated_at from public.imam_sync s where s.sync_id=p_sync_id and s.owner_user_id=v_uid;
end;
$$;

revoke all on function public.imam_sync_push(text,text,text) from public;
revoke all on function public.imam_sync_pull(text,text) from public;
grant execute on function public.imam_sync_push(text,text,text) to authenticated;
grant execute on function public.imam_sync_pull(text,text) to authenticated;

-- Expected result:
-- • info.welivequran@gmail.com becomes active owner on first Google login.
-- • Every other new Google account becomes pending.
-- • Only the active owner can list/update all app_users.
-- • No anonymous direct table access.
-- • Cloud sync RPC requires an authenticated user and is scoped to auth.uid().

-- ============================================================
-- v10.1.4 — SAFE MULTI-DEVICE ACCOUNT SYNC
-- ============================================================
create table if not exists public.account_sync (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null default now(),
  revision bigint not null default 0
);
alter table public.account_sync add column if not exists revision bigint not null default 0;
alter table public.account_sync enable row level security;
revoke all on table public.account_sync from anon, authenticated;
drop policy if exists "account_sync_select" on public.account_sync;
drop policy if exists "account_sync_insert" on public.account_sync;
drop policy if exists "account_sync_update" on public.account_sync;
drop policy if exists "account_sync_delete" on public.account_sync;

do $$
begin
  if to_regprocedure('public.account_sync_push(text)') is not null then
    execute 'revoke all on function public.account_sync_push(text) from anon, authenticated';
  end if;
  if to_regprocedure('public.account_sync_pull()') is not null then
    execute 'revoke all on function public.account_sync_pull() from anon, authenticated';
  end if;
end $$;

create or replace function public.account_sync_pull_v2()
returns table(payload text, updated_at timestamptz, revision bigint)
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  return query select s.payload,s.updated_at,s.revision from public.account_sync s where s.owner_user_id=v_uid;
end;
$$;

create or replace function public.account_sync_push_v2(p_payload text,p_expected_revision bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_current bigint;
  v_next bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_payload is null or length(p_payload)<20 or length(p_payload)>50000000 then raise exception 'INVALID_PAYLOAD'; end if;
  if p_expected_revision is null or p_expected_revision<0 then raise exception 'INVALID_EXPECTED_REVISION'; end if;
  select s.revision into v_current from public.account_sync s where s.owner_user_id=v_uid for update;
  if not found then
    if p_expected_revision<>0 then raise exception 'SYNC_REVISION_CONFLICT current=0 expected=%',p_expected_revision; end if;
    insert into public.account_sync(owner_user_id,payload,updated_at,revision) values(v_uid,p_payload,now(),1) on conflict(owner_user_id) do nothing;
    if found then return jsonb_build_object('ok',true,'revision',1,'created',true,'updated_at',now()); end if;
    select s.revision into v_current from public.account_sync s where s.owner_user_id=v_uid for update;
    raise exception 'SYNC_REVISION_CONFLICT current=% expected=0',coalesce(v_current,0);
  end if;
  if v_current<>p_expected_revision then raise exception 'SYNC_REVISION_CONFLICT current=% expected=%',v_current,p_expected_revision; end if;
  v_next:=v_current+1;
  update public.account_sync set payload=p_payload,updated_at=now(),revision=v_next where owner_user_id=v_uid;
  return jsonb_build_object('ok',true,'revision',v_next,'created',false,'updated_at',now());
end;
$$;
revoke all on function public.account_sync_pull_v2() from public;
revoke all on function public.account_sync_push_v2(text,bigint) from public;
grant execute on function public.account_sync_pull_v2() to authenticated;
grant execute on function public.account_sync_push_v2(text,bigint) to authenticated;

-- ═══════════════════════════════════════════════════════════════
-- v10.10.0 Guardian & Student Portal Stage 2
-- Same additive definitions as sql/guardian-portal-live.sql.
-- Existing installations should run guardian-portal-live.sql once.
-- ═══════════════════════════════════════════════════════════════

create table if not exists public.guardian_portal_shares (
  share_token uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  student_ref text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint guardian_portal_student_ref_format check (student_ref ~ '^[0-9a-f]{64}$'),
  constraint guardian_portal_snapshot_object check (jsonb_typeof(snapshot) = 'object'),
  constraint guardian_portal_owner_student_unique unique(owner_user_id, student_ref)
);
alter table public.guardian_portal_shares enable row level security;
revoke all on table public.guardian_portal_shares from public, anon, authenticated;
drop policy if exists "guardian_portal_direct_select" on public.guardian_portal_shares;
drop policy if exists "guardian_portal_direct_insert" on public.guardian_portal_shares;
drop policy if exists "guardian_portal_direct_update" on public.guardian_portal_shares;
drop policy if exists "guardian_portal_direct_delete" on public.guardian_portal_shares;

create or replace function public.guardian_portal_publish(p_student_ref text,p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_row public.guardian_portal_shares%rowtype; v_created boolean := false; v_rotated boolean := false;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then raise exception 'ACTIVE_ACCOUNT_REQUIRED'; end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' or p_snapshot->>'v' <> '1' then raise exception 'INVALID_SNAPSHOT'; end if;
  if octet_length(p_snapshot::text) > 250000 then raise exception 'SNAPSHOT_TOO_LARGE'; end if;
  select * into v_row from public.guardian_portal_shares s where s.owner_user_id=v_uid and s.student_ref=p_student_ref for update;
  if not found then
    insert into public.guardian_portal_shares(owner_user_id,student_ref,snapshot) values(v_uid,p_student_ref,p_snapshot) returning * into v_row; v_created := true;
  elsif v_row.revoked_at is not null then
    update public.guardian_portal_shares set share_token=gen_random_uuid(),snapshot=p_snapshot,updated_at=now(),revoked_at=null where owner_user_id=v_uid and student_ref=p_student_ref returning * into v_row; v_rotated := true;
  else
    update public.guardian_portal_shares set snapshot=p_snapshot,updated_at=now() where owner_user_id=v_uid and student_ref=p_student_ref returning * into v_row;
  end if;
  return jsonb_build_object('ok',true,'token',v_row.share_token,'updated_at',v_row.updated_at,'created',v_created,'rotated',v_rotated);
end;$$;

create or replace function public.guardian_portal_status(p_student_ref text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_row public.guardian_portal_shares%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then raise exception 'ACTIVE_ACCOUNT_REQUIRED'; end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  select * into v_row from public.guardian_portal_shares s where s.owner_user_id=v_uid and s.student_ref=p_student_ref;
  if not found then return jsonb_build_object('exists',false); end if;
  return jsonb_build_object('exists',true,'active',v_row.revoked_at is null,'token',v_row.share_token,'updated_at',v_row.updated_at,'revoked_at',v_row.revoked_at);
end;$$;

create or replace function public.guardian_portal_revoke(p_student_ref text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_count integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then raise exception 'ACTIVE_ACCOUNT_REQUIRED'; end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  update public.guardian_portal_shares set revoked_at=now(),updated_at=now() where owner_user_id=v_uid and student_ref=p_student_ref and revoked_at is null;
  get diagnostics v_count = row_count; return jsonb_build_object('ok',v_count>0,'revoked',v_count>0);
end;$$;

create or replace function public.guardian_portal_read(p_token uuid)
returns jsonb language sql security definer stable set search_path = public, pg_temp as $$
  select jsonb_build_object('snapshot',s.snapshot,'updated_at',s.updated_at) from public.guardian_portal_shares s where s.share_token=p_token and s.revoked_at is null and exists(select 1 from public.app_users u where u.user_id=s.owner_user_id and u.status='active') limit 1;
$$;

revoke all on function public.guardian_portal_publish(text,jsonb) from public;
revoke all on function public.guardian_portal_status(text) from public;
revoke all on function public.guardian_portal_revoke(text) from public;
revoke all on function public.guardian_portal_read(uuid) from public;
grant execute on function public.guardian_portal_publish(text,jsonb) to authenticated;
grant execute on function public.guardian_portal_status(text) to authenticated;
grant execute on function public.guardian_portal_revoke(text) to authenticated;
grant execute on function public.guardian_portal_read(uuid) to anon, authenticated;
