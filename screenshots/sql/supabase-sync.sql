-- We Live Quran v10.1.2 — authenticated encrypted sync
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

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
