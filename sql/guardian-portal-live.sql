-- We Live Quran v10.10.0 — Guardian & Student Portal Stage 2
-- Stable, revocable read-only guardian links.
-- Safe additive migration: does not alter students, sessions, account_sync, or local Schema 12.

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

create or replace function public.guardian_portal_publish(
  p_student_ref text,
  p_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.guardian_portal_shares%rowtype;
  v_created boolean := false;
  v_rotated boolean := false;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' or p_snapshot->>'v' <> '1' then raise exception 'INVALID_SNAPSHOT'; end if;
  if octet_length(p_snapshot::text) > 250000 then raise exception 'SNAPSHOT_TOO_LARGE'; end if;

  select * into v_row
  from public.guardian_portal_shares s
  where s.owner_user_id=v_uid and s.student_ref=p_student_ref
  for update;

  if not found then
    insert into public.guardian_portal_shares(owner_user_id,student_ref,snapshot)
    values(v_uid,p_student_ref,p_snapshot)
    returning * into v_row;
    v_created := true;
  elsif v_row.revoked_at is not null then
    update public.guardian_portal_shares
    set share_token=gen_random_uuid(),snapshot=p_snapshot,updated_at=now(),revoked_at=null
    where owner_user_id=v_uid and student_ref=p_student_ref
    returning * into v_row;
    v_rotated := true;
  else
    update public.guardian_portal_shares
    set snapshot=p_snapshot,updated_at=now()
    where owner_user_id=v_uid and student_ref=p_student_ref
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'ok',true,
    'token',v_row.share_token,
    'updated_at',v_row.updated_at,
    'created',v_created,
    'rotated',v_rotated
  );
end;
$$;

create or replace function public.guardian_portal_status(p_student_ref text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.guardian_portal_shares%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;

  select * into v_row
  from public.guardian_portal_shares s
  where s.owner_user_id=v_uid and s.student_ref=p_student_ref;

  if not found then return jsonb_build_object('exists',false); end if;
  return jsonb_build_object(
    'exists',true,
    'active',v_row.revoked_at is null,
    'token',v_row.share_token,
    'updated_at',v_row.updated_at,
    'revoked_at',v_row.revoked_at
  );
end;
$$;

create or replace function public.guardian_portal_revoke(p_student_ref text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;

  update public.guardian_portal_shares
  set revoked_at=now(),updated_at=now()
  where owner_user_id=v_uid and student_ref=p_student_ref and revoked_at is null;
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok',v_count>0,'revoked',v_count>0);
end;
$$;

create or replace function public.guardian_portal_read(p_token uuid)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object('snapshot',s.snapshot,'updated_at',s.updated_at)
  from public.guardian_portal_shares s
  where s.share_token=p_token and s.revoked_at is null
    and exists(select 1 from public.app_users u where u.user_id=s.owner_user_id and u.status='active')
  limit 1;
$$;

revoke all on function public.guardian_portal_publish(text,jsonb) from public;
revoke all on function public.guardian_portal_status(text) from public;
revoke all on function public.guardian_portal_revoke(text) from public;
revoke all on function public.guardian_portal_read(uuid) from public;

grant execute on function public.guardian_portal_publish(text,jsonb) to authenticated;
grant execute on function public.guardian_portal_status(text) to authenticated;
grant execute on function public.guardian_portal_revoke(text) to authenticated;
grant execute on function public.guardian_portal_read(uuid) to anon, authenticated;

-- Security model:
-- • Browser roles have zero direct table access.
-- • Teachers can publish/status/revoke only for auth.uid() and only while app_users.status='active'.
-- • Guardians can call only guardian_portal_read(token); a random UUID capability is required.
-- • Revoking a link makes the old token unreadable. Republish after revoke rotates to a fresh token.
-- • Snapshot payload never needs phone numbers, student IDs, or session IDs.
