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

-- ═══════════════════════════════════════════════════════════════
-- v10.10.0 Guardian & Student Portal Stage 3
-- Phone + PIN guardian login. Same definitions as sql/guardian-portal-login.sql.
-- Existing Stage 2 installations should run guardian-portal-login.sql once.
-- ═══════════════════════════════════════════════════════════════

-- We Live Quran v10.10.0 — Guardian & Student Portal Stage 3
-- Guardian sign-in with the student's registered phone number + a 6-digit PIN.
-- Additive backend-only migration. Local application Schema remains 12.
-- Requires Stage 2 (sql/guardian-portal-live.sql) to be installed first.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.guardian_portal_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  phone_hash text not null,
  phone_last4 text not null,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz,
  constraint guardian_portal_phone_hash_format check (phone_hash ~ '^[0-9a-f]{64}$'),
  constraint guardian_portal_phone_last4_format check (phone_last4 ~ '^[0-9]{4}$'),
  constraint guardian_portal_owner_phone_unique unique(owner_user_id, phone_hash)
);

alter table public.guardian_portal_accounts enable row level security;
revoke all on table public.guardian_portal_accounts from public, anon, authenticated;

alter table public.guardian_portal_shares
  add column if not exists guardian_account_id uuid references public.guardian_portal_accounts(id) on delete set null;

create index if not exists guardian_portal_shares_account_idx
  on public.guardian_portal_shares(guardian_account_id)
  where guardian_account_id is not null;

create table if not exists public.guardian_portal_login_guard (
  phone_hash text primary key,
  failed_attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint guardian_login_guard_hash_format check (phone_hash ~ '^[0-9a-f]{64}$'),
  constraint guardian_login_guard_attempts_nonnegative check (failed_attempts >= 0)
);

alter table public.guardian_portal_login_guard enable row level security;
revoke all on table public.guardian_portal_login_guard from public, anon, authenticated;

create table if not exists public.guardian_portal_sessions (
  session_token uuid primary key default gen_random_uuid(),
  account_ids uuid[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours'),
  revoked_at timestamptz,
  constraint guardian_portal_session_accounts_nonempty check (cardinality(account_ids) > 0)
);

alter table public.guardian_portal_sessions enable row level security;
revoke all on table public.guardian_portal_sessions from public, anon, authenticated;
create index if not exists guardian_portal_sessions_expiry_idx on public.guardian_portal_sessions(expires_at);

-- Internal helper. It accepts Egyptian mobile forms such as 01xxxxxxxxx,
-- +201xxxxxxxxx, 201xxxxxxxxx, or 00201xxxxxxxxx and returns 201xxxxxxxxx.
create or replace function public.guardian_portal_normalize_phone(p_phone text)
returns text
language plpgsql
immutable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v text := regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g');
begin
  if v like '0020%' then v := substr(v, 3); end if;
  if v ~ '^01[0125][0-9]{8}$' then v := '20' || substr(v, 2); end if;
  if v !~ '^20(10|11|12|15)[0-9]{8}$' then
    raise exception 'INVALID_PHONE';
  end if;
  return v;
end;
$$;

create or replace function public.guardian_portal_phone_hash(p_phone text)
returns text
language sql
immutable
security definer
set search_path = public, extensions, pg_temp
as $$
  select encode(digest('guardian-portal-v3|' || public.guardian_portal_normalize_phone(p_phone), 'sha256'), 'hex');
$$;

revoke all on function public.guardian_portal_normalize_phone(text) from public;
revoke all on function public.guardian_portal_phone_hash(text) from public;

-- Teacher-only: status for the currently selected student.
create or replace function public.guardian_portal_access_status(p_student_ref text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account public.guardian_portal_accounts%rowtype;
  v_sibling_count integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_STUDENT_REF';
  end if;

  select a.* into v_account
  from public.guardian_portal_shares s
  join public.guardian_portal_accounts a on a.id=s.guardian_account_id
  where s.owner_user_id=v_uid and s.student_ref=p_student_ref
  limit 1;

  if not found then
    return jsonb_build_object('linked',false);
  end if;

  select count(*) into v_sibling_count
  from public.guardian_portal_shares s
  where s.guardian_account_id=v_account.id;

  return jsonb_build_object(
    'linked',true,
    'active',v_account.disabled_at is null,
    'phone_last4',v_account.phone_last4,
    'student_count',v_sibling_count,
    'updated_at',v_account.updated_at
  );
end;
$$;

-- Teacher-only: create/link a phone account and make sure the latest snapshot is published.
-- p_reset_pin=false keeps the existing PIN if this phone already has an account (useful for siblings).
create or replace function public.guardian_portal_access_enable(
  p_student_ref text,
  p_phone text,
  p_pin text,
  p_snapshot jsonb,
  p_reset_pin boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_phone text;
  v_phone_hash text;
  v_account public.guardian_portal_accounts%rowtype;
  v_old_account_id uuid;
  v_share_token uuid;
  v_created boolean := false;
  v_pin_changed boolean := false;
  v_was_disabled boolean := false;
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then raise exception 'INVALID_PIN'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' or p_snapshot->>'v'<>'1' then raise exception 'INVALID_SNAPSHOT'; end if;
  if octet_length(p_snapshot::text)>250000 then raise exception 'SNAPSHOT_TOO_LARGE'; end if;

  v_phone := public.guardian_portal_normalize_phone(p_phone);
  v_phone_hash := public.guardian_portal_phone_hash(v_phone);

  select a.* into v_account
  from public.guardian_portal_accounts a
  where a.owner_user_id=v_uid and a.phone_hash=v_phone_hash
  for update;

  if not found then
    insert into public.guardian_portal_accounts(owner_user_id,phone_hash,phone_last4,pin_hash)
    values(v_uid,v_phone_hash,right(v_phone,4),crypt(p_pin,gen_salt('bf',10)))
    returning * into v_account;
    v_created := true;
    v_pin_changed := true;
  else
    v_was_disabled := v_account.disabled_at is not null;
    update public.guardian_portal_accounts
    set disabled_at=null,
        phone_last4=right(v_phone,4),
        updated_at=now(),
        pin_hash=case when p_reset_pin or v_was_disabled then crypt(p_pin,gen_salt('bf',10)) else pin_hash end
    where id=v_account.id
    returning * into v_account;
    v_pin_changed := coalesce(p_reset_pin,false) or v_was_disabled;
  end if;

  select guardian_account_id into v_old_account_id
  from public.guardian_portal_shares
  where owner_user_id=v_uid and student_ref=p_student_ref;

  -- Keep phone/PIN access independent from the optional Stage 2 direct-link state.
  -- A newly created backing share starts revoked, so enabling phone login does not
  -- silently create a public capability link. Existing direct-link state is preserved.
  insert into public.guardian_portal_shares(owner_user_id,student_ref,snapshot,guardian_account_id,revoked_at)
  values(v_uid,p_student_ref,p_snapshot,v_account.id,now())
  on conflict(owner_user_id,student_ref) do update
    set snapshot=excluded.snapshot,guardian_account_id=excluded.guardian_account_id,updated_at=now()
  returning share_token into v_share_token;

  -- If the student moved to a different phone account, invalidate the old account's sessions.
  if v_old_account_id is not null and v_old_account_id<>v_account.id then
    update public.guardian_portal_sessions set revoked_at=coalesce(revoked_at,now())
    where v_old_account_id=any(account_ids) and revoked_at is null;
    if not exists(select 1 from public.guardian_portal_shares where guardian_account_id=v_old_account_id) then
      update public.guardian_portal_accounts set disabled_at=now(),updated_at=now() where id=v_old_account_id;
    end if;
  end if;

  -- PIN resets invalidate all existing sessions for this guardian account.
  if v_pin_changed and not v_created then
    update public.guardian_portal_sessions set revoked_at=coalesce(revoked_at,now())
    where v_account.id=any(account_ids) and revoked_at is null;
  end if;

  select count(*) into v_count from public.guardian_portal_shares
  where guardian_account_id=v_account.id and revoked_at is null;

  return jsonb_build_object(
    'ok',true,
    'account_created',v_created,
    'pin_changed',v_pin_changed,
    'phone_last4',v_account.phone_last4,
    'student_count',v_count,
    'share_token',v_share_token
  );
end;
$$;

-- Teacher-only: change PIN for the guardian account linked to this student.
create or replace function public.guardian_portal_access_reset_pin(p_student_ref text,p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account_id uuid;
  v_last4 text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then raise exception 'ACTIVE_ACCOUNT_REQUIRED'; end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then raise exception 'INVALID_PIN'; end if;

  select a.id,a.phone_last4 into v_account_id,v_last4
  from public.guardian_portal_shares s
  join public.guardian_portal_accounts a on a.id=s.guardian_account_id
  where s.owner_user_id=v_uid and s.student_ref=p_student_ref
  limit 1;

  if v_account_id is null then raise exception 'GUARDIAN_ACCESS_NOT_LINKED'; end if;

  update public.guardian_portal_accounts
  set pin_hash=crypt(p_pin,gen_salt('bf',10)),disabled_at=null,updated_at=now()
  where id=v_account_id;

  update public.guardian_portal_sessions set revoked_at=coalesce(revoked_at,now())
  where v_account_id=any(account_ids) and revoked_at is null;

  return jsonb_build_object('ok',true,'pin_changed',true,'phone_last4',v_last4);
end;
$$;

-- Teacher-only: remove this student from phone/PIN access without deleting student/session data.
create or replace function public.guardian_portal_access_unlink(p_student_ref text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account_id uuid;
  v_remaining integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then raise exception 'ACTIVE_ACCOUNT_REQUIRED'; end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;

  select guardian_account_id into v_account_id
  from public.guardian_portal_shares
  where owner_user_id=v_uid and student_ref=p_student_ref
  for update;

  if v_account_id is null then return jsonb_build_object('ok',false,'unlinked',false); end if;

  update public.guardian_portal_shares
  set guardian_account_id=null,updated_at=now()
  where owner_user_id=v_uid and student_ref=p_student_ref;

  update public.guardian_portal_sessions set revoked_at=coalesce(revoked_at,now())
  where v_account_id=any(account_ids) and revoked_at is null;

  select count(*) into v_remaining from public.guardian_portal_shares
  where guardian_account_id=v_account_id;

  if v_remaining=0 then
    update public.guardian_portal_accounts set disabled_at=now(),updated_at=now() where id=v_account_id;
  end if;

  return jsonb_build_object('ok',true,'unlinked',true,'remaining_students',v_remaining);
end;
$$;

-- Teacher-only: refresh the snapshot used by phone/PIN access without changing Stage 2 link state.
create or replace function public.guardian_portal_access_refresh(p_student_ref text,p_snapshot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then raise exception 'ACTIVE_ACCOUNT_REQUIRED'; end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' or p_snapshot->>'v'<>'1' then raise exception 'INVALID_SNAPSHOT'; end if;
  if octet_length(p_snapshot::text)>250000 then raise exception 'SNAPSHOT_TOO_LARGE'; end if;

  update public.guardian_portal_shares
  set snapshot=p_snapshot,updated_at=now()
  where owner_user_id=v_uid and student_ref=p_student_ref and guardian_account_id is not null;
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok',true,'refreshed',v_count>0);
end;
$$;

-- Public: verify phone + PIN and mint a short-lived opaque session token.
create or replace function public.guardian_portal_login(p_phone text,p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_phone_hash text;
  v_guard public.guardian_portal_login_guard%rowtype;
  v_guard_exists boolean := false;
  v_account_exists boolean := false;
  v_accounts uuid[];
  v_attempts integer := 0;
  v_session public.guardian_portal_sessions%rowtype;
begin
  -- Keep credential errors generic; callers should not learn whether a phone exists.
  begin
    v_phone_hash := public.guardian_portal_phone_hash(p_phone);
  exception when others then
    perform pg_sleep(0.35);
    return jsonb_build_object('ok',false,'error','INVALID_CREDENTIALS');
  end;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    perform pg_sleep(0.35);
    return jsonb_build_object('ok',false,'error','INVALID_CREDENTIALS');
  end if;

  select * into v_guard from public.guardian_portal_login_guard where phone_hash=v_phone_hash for update;
  v_guard_exists := found;
  if v_guard_exists and v_guard.locked_until is not null and v_guard.locked_until>now() then
    return jsonb_build_object('ok',false,'error','TOO_MANY_ATTEMPTS');
  end if;

  select exists(
    select 1 from public.guardian_portal_accounts a
    where a.phone_hash=v_phone_hash and a.disabled_at is null
      and exists(select 1 from public.app_users u where u.user_id=a.owner_user_id and u.status='active')
      and exists(select 1 from public.guardian_portal_shares s where s.guardian_account_id=a.id)
  ) into v_account_exists;
  if not v_account_exists then
    perform pg_sleep(0.35);
    return jsonb_build_object('ok',false,'error','INVALID_CREDENTIALS');
  end if;

  select array_agg(a.id order by a.id) into v_accounts
  from public.guardian_portal_accounts a
  where a.phone_hash=v_phone_hash
    and a.disabled_at is null
    and a.pin_hash=crypt(p_pin,a.pin_hash)
    and exists(select 1 from public.app_users u where u.user_id=a.owner_user_id and u.status='active')
    and exists(
      select 1 from public.guardian_portal_shares s
      where s.guardian_account_id=a.id
    );

  if v_accounts is null or cardinality(v_accounts)=0 then
    if (not v_guard_exists) or v_guard.window_started_at < now()-interval '15 minutes' then
      insert into public.guardian_portal_login_guard(phone_hash,failed_attempts,window_started_at,locked_until,updated_at)
      values(v_phone_hash,1,now(),null,now())
      on conflict(phone_hash) do update set failed_attempts=1,window_started_at=now(),locked_until=null,updated_at=now();
      v_attempts := 1;
    else
      v_attempts := coalesce(v_guard.failed_attempts,0)+1;
      update public.guardian_portal_login_guard
      set failed_attempts=case when v_attempts>=8 then 0 else v_attempts end,
          locked_until=case when v_attempts>=8 then now()+interval '15 minutes' else null end,
          updated_at=now()
      where phone_hash=v_phone_hash;
    end if;
    perform pg_sleep(0.35);
    if v_attempts>=8 then
      return jsonb_build_object('ok',false,'error','TOO_MANY_ATTEMPTS');
    end if;
    return jsonb_build_object('ok',false,'error','INVALID_CREDENTIALS');
  end if;

  insert into public.guardian_portal_login_guard(phone_hash,failed_attempts,window_started_at,locked_until,updated_at)
  values(v_phone_hash,0,now(),null,now())
  on conflict(phone_hash) do update set failed_attempts=0,window_started_at=now(),locked_until=null,updated_at=now();

  insert into public.guardian_portal_sessions(account_ids)
  values(v_accounts)
  returning * into v_session;

  return jsonb_build_object(
    'ok',true,
    'session_token',v_session.session_token,
    'expires_at',v_session.expires_at,
    'account_count',cardinality(v_accounts)
  );
end;
$$;

-- Public: read only the students authorized by a previously verified session token.
create or replace function public.guardian_portal_session_read(p_session uuid)
returns jsonb
language sql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
  select jsonb_build_object(
    'expires_at',sess.expires_at,
    'students',coalesce((
      select jsonb_agg(jsonb_build_object('snapshot',s.snapshot,'updated_at',s.updated_at) order by s.snapshot#>>'{student,name}')
      from public.guardian_portal_shares s
      join public.guardian_portal_accounts a on a.id=s.guardian_account_id
      where a.id=any(sess.account_ids)
        and a.disabled_at is null
        and exists(select 1 from public.app_users u where u.user_id=s.owner_user_id and u.status='active')
    ),'[]'::jsonb)
  )
  from public.guardian_portal_sessions sess
  where sess.session_token=p_session
    and sess.revoked_at is null
    and sess.expires_at>now()
  limit 1;
$$;

create or replace function public.guardian_portal_session_logout(p_session uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  update public.guardian_portal_sessions
  set revoked_at=coalesce(revoked_at,now())
  where session_token=p_session and revoked_at is null;
  return found;
end;
$$;

revoke all on function public.guardian_portal_access_status(text) from public;
revoke all on function public.guardian_portal_access_enable(text,text,text,jsonb,boolean) from public;
revoke all on function public.guardian_portal_access_reset_pin(text,text) from public;
revoke all on function public.guardian_portal_access_unlink(text) from public;
revoke all on function public.guardian_portal_access_refresh(text,jsonb) from public;
revoke all on function public.guardian_portal_login(text,text) from public;
revoke all on function public.guardian_portal_session_read(uuid) from public;
revoke all on function public.guardian_portal_session_logout(uuid) from public;

grant execute on function public.guardian_portal_access_status(text) to authenticated;
grant execute on function public.guardian_portal_access_enable(text,text,text,jsonb,boolean) to authenticated;
grant execute on function public.guardian_portal_access_reset_pin(text,text) to authenticated;
grant execute on function public.guardian_portal_access_unlink(text) to authenticated;
grant execute on function public.guardian_portal_access_refresh(text,jsonb) to authenticated;
grant execute on function public.guardian_portal_login(text,text) to anon, authenticated;
grant execute on function public.guardian_portal_session_read(uuid) to anon, authenticated;
grant execute on function public.guardian_portal_session_logout(uuid) to anon, authenticated;

-- Stage 3 security model:
-- • No browser role has direct access to guardian account, login-guard, session, or share tables.
-- • Full phone numbers are not stored in Stage 3 tables: only a SHA-256 lookup hash + last 4 digits.
-- • PINs are bcrypt-hashed with pgcrypto and are never returned by SQL.
-- • Public login responses do not reveal whether a phone number exists.
-- • Eight failed attempts within 15 minutes lock that phone hash for 15 minutes.
-- • Successful login returns an opaque 12-hour session token; the PIN is not placed in URLs.
-- • Phone/PIN access is read-only and only returns active published snapshots.

-- =========================================================
-- v10.10.0 Guardian Portal Stage 3.3 — Forgot PIN Requests
-- =========================================================

-- We Live Quran v10.10.0 — Guardian Portal Stage 3.3
-- Forgot-PIN request workflow: guardian requests a reset by phone; the teacher resolves it.
-- Additive only. Local application Schema remains 12 and student/session data is untouched.
-- Requires Stage 3 (sql/guardian-portal-login.sql).

create table if not exists public.guardian_portal_reset_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.guardian_portal_accounts(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now(),
  request_count integer not null default 1,
  resolved_at timestamptz,
  constraint guardian_reset_request_status check (status in ('pending','resolved','dismissed')),
  constraint guardian_reset_request_count_positive check (request_count > 0)
);

alter table public.guardian_portal_reset_requests enable row level security;
revoke all on table public.guardian_portal_reset_requests from public, anon, authenticated;

create unique index if not exists guardian_portal_reset_one_pending_per_account
  on public.guardian_portal_reset_requests(account_id)
  where status='pending';

create index if not exists guardian_portal_reset_owner_pending_idx
  on public.guardian_portal_reset_requests(owner_user_id, last_requested_at desc)
  where status='pending';

create table if not exists public.guardian_portal_reset_guard (
  phone_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint guardian_reset_guard_hash_format check (phone_hash ~ '^[0-9a-f]{64}$'),
  constraint guardian_reset_guard_count_nonnegative check (request_count >= 0)
);

alter table public.guardian_portal_reset_guard enable row level security;
revoke all on table public.guardian_portal_reset_guard from public, anon, authenticated;

-- Public. Always returns the same success envelope so a caller cannot discover
-- whether a phone number exists in the academy. Up to 3 accepted requests per
-- phone hash per 24-hour window; extra requests are silently ignored.
create or replace function public.guardian_portal_request_pin_reset(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_phone_hash text;
  v_guard public.guardian_portal_reset_guard%rowtype;
  v_guard_exists boolean := false;
  v_accounts uuid[];
  v_account_id uuid;
  v_owner_id uuid;
  v_count integer := 0;
begin
  begin
    v_phone_hash := public.guardian_portal_phone_hash(p_phone);
  exception when others then
    perform pg_sleep(0.30);
    return jsonb_build_object('ok',true,'status','REQUEST_RECORDED');
  end;

  select array_agg(a.id order by a.id)
  into v_accounts
  from public.guardian_portal_accounts a
  where a.phone_hash=v_phone_hash
    and a.disabled_at is null
    and exists(
      select 1 from public.app_users u
      where u.user_id=a.owner_user_id and u.status='active'
    )
    and exists(
      select 1 from public.guardian_portal_shares s
      where s.guardian_account_id=a.id
    );

  if v_accounts is null or cardinality(v_accounts)=0 then
    perform pg_sleep(0.30);
    return jsonb_build_object('ok',true,'status','REQUEST_RECORDED');
  end if;

  select * into v_guard
  from public.guardian_portal_reset_guard
  where phone_hash=v_phone_hash
  for update;
  v_guard_exists := found;

  if v_guard_exists and v_guard.blocked_until is not null and v_guard.blocked_until>now() then
    perform pg_sleep(0.30);
    return jsonb_build_object('ok',true,'status','REQUEST_RECORDED');
  end if;

  if (not v_guard_exists) or v_guard.window_started_at < now()-interval '24 hours' then
    insert into public.guardian_portal_reset_guard(phone_hash,window_started_at,request_count,blocked_until,updated_at)
    values(v_phone_hash,now(),1,null,now())
    on conflict(phone_hash) do update
      set window_started_at=now(),request_count=1,blocked_until=null,updated_at=now();
    v_count := 1;
  else
    v_count := coalesce(v_guard.request_count,0)+1;
    update public.guardian_portal_reset_guard
    set request_count=v_count,
        blocked_until=case when v_count>=3 then v_guard.window_started_at+interval '24 hours' else null end,
        updated_at=now()
    where phone_hash=v_phone_hash;
  end if;

  -- The third accepted request is recorded; requests after it are ignored until
  -- the 24-hour window resets.
  if v_count>3 then
    perform pg_sleep(0.30);
    return jsonb_build_object('ok',true,'status','REQUEST_RECORDED');
  end if;

  foreach v_account_id in array v_accounts loop
    select a.owner_user_id into v_owner_id
    from public.guardian_portal_accounts a
    where a.id=v_account_id;

    insert into public.guardian_portal_reset_requests(account_id,owner_user_id,status,requested_at,last_requested_at,request_count)
    values(v_account_id,v_owner_id,'pending',now(),now(),1)
    on conflict(account_id) where status='pending'
    do update set last_requested_at=now(),request_count=public.guardian_portal_reset_requests.request_count+1;
  end loop;

  perform pg_sleep(0.30);
  return jsonb_build_object('ok',true,'status','REQUEST_RECORDED');
end;
$$;

-- Teacher-only. Returns pending requests for the signed-in teacher with only
-- last 4 phone digits and the already-published student names/refs.
create or replace function public.guardian_portal_reset_requests_list()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;

  select jsonb_build_object(
    'requests',coalesce(jsonb_agg(
      jsonb_build_object(
        'id',r.id,
        'phone_last4',a.phone_last4,
        'requested_at',r.last_requested_at,
        'request_count',r.request_count,
        'students',coalesce((
          select jsonb_agg(jsonb_build_object(
            'student_ref',s.student_ref,
            'name',coalesce(s.snapshot#>>'{student,name}','طالب')
          ) order by coalesce(s.snapshot#>>'{student,name}','طالب'))
          from public.guardian_portal_shares s
          where s.guardian_account_id=a.id
        ),'[]'::jsonb)
      ) order by r.last_requested_at desc
    ),'[]'::jsonb)
  ) into v_result
  from public.guardian_portal_reset_requests r
  join public.guardian_portal_accounts a on a.id=r.account_id
  where r.owner_user_id=v_uid and r.status='pending' and a.disabled_at is null;

  return coalesce(v_result,jsonb_build_object('requests','[]'::jsonb));
end;
$$;

-- Teacher-only. Generates a new PIN supplied by the teacher app, invalidates
-- current guardian sessions, and resolves every pending request for that account.
create or replace function public.guardian_portal_reset_request_resolve(
  p_request uuid,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account_id uuid;
  v_last4 text;
  v_students jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then raise exception 'INVALID_PIN'; end if;

  select r.account_id,a.phone_last4
  into v_account_id,v_last4
  from public.guardian_portal_reset_requests r
  join public.guardian_portal_accounts a on a.id=r.account_id
  where r.id=p_request and r.owner_user_id=v_uid and r.status='pending'
  for update of r;

  if v_account_id is null then raise exception 'RESET_REQUEST_NOT_FOUND'; end if;

  update public.guardian_portal_accounts
  set pin_hash=crypt(p_pin,gen_salt('bf',10)),disabled_at=null,updated_at=now()
  where id=v_account_id and owner_user_id=v_uid;

  update public.guardian_portal_sessions
  set revoked_at=coalesce(revoked_at,now())
  where v_account_id=any(account_ids) and revoked_at is null;

  update public.guardian_portal_reset_requests
  set status='resolved',resolved_at=now()
  where account_id=v_account_id and owner_user_id=v_uid and status='pending';

  select coalesce(jsonb_agg(jsonb_build_object(
    'student_ref',s.student_ref,
    'name',coalesce(s.snapshot#>>'{student,name}','طالب')
  ) order by coalesce(s.snapshot#>>'{student,name}','طالب')),'[]'::jsonb)
  into v_students
  from public.guardian_portal_shares s
  where s.guardian_account_id=v_account_id;

  return jsonb_build_object(
    'ok',true,
    'phone_last4',v_last4,
    'students',v_students
  );
end;
$$;

create or replace function public.guardian_portal_reset_request_dismiss(p_request uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;

  update public.guardian_portal_reset_requests
  set status='dismissed',resolved_at=now()
  where id=p_request and owner_user_id=v_uid and status='pending';
  get diagnostics v_count=row_count;

  return jsonb_build_object('ok',v_count>0,'dismissed',v_count>0);
end;
$$;


-- Any teacher-side PIN rotation (including the existing Stage 3 manual reset)
-- automatically closes pending forgot-PIN requests for that guardian account.
create or replace function public.guardian_portal_close_reset_requests_on_pin_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if new.pin_hash is distinct from old.pin_hash then
    update public.guardian_portal_reset_requests
    set status='resolved',resolved_at=now()
    where account_id=new.id and status='pending';
  end if;
  return new;
end;
$$;

drop trigger if exists guardian_portal_close_reset_requests_on_pin_change on public.guardian_portal_accounts;
create trigger guardian_portal_close_reset_requests_on_pin_change
after update of pin_hash on public.guardian_portal_accounts
for each row execute function public.guardian_portal_close_reset_requests_on_pin_change();

revoke all on function public.guardian_portal_close_reset_requests_on_pin_change() from public;

revoke all on function public.guardian_portal_request_pin_reset(text) from public;
revoke all on function public.guardian_portal_reset_requests_list() from public;
revoke all on function public.guardian_portal_reset_request_resolve(uuid,text) from public;
revoke all on function public.guardian_portal_reset_request_dismiss(uuid) from public;

grant execute on function public.guardian_portal_request_pin_reset(text) to anon, authenticated;
grant execute on function public.guardian_portal_reset_requests_list() to authenticated;
grant execute on function public.guardian_portal_reset_request_resolve(uuid,text) to authenticated;
grant execute on function public.guardian_portal_reset_request_dismiss(uuid) to authenticated;

-- Stage 3.3 security notes:
-- • Forgot-PIN responses are generic and do not reveal whether a phone exists.
-- • Public reset requests are limited to 3 accepted requests per phone hash / 24 hours.
-- • Only the owning active teacher can list, resolve, or dismiss requests.
-- • Resolving a request rotates the bcrypt PIN and revokes existing guardian sessions.
-- • No student/session rows are modified and Local Schema remains 12.

