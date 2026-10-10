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
