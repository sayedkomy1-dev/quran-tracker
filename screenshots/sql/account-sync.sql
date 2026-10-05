-- We Live Quran v10.1.4
-- Safe multi-device account sync.
-- Browser payloads are encrypted before upload. Supabase stores ciphertext only.
-- Revision compare-and-swap prevents an older device from overwriting a newer cloud snapshot.

create table if not exists public.account_sync (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null default now(),
  revision bigint not null default 0
);

alter table public.account_sync add column if not exists revision bigint not null default 0;
alter table public.account_sync enable row level security;

-- No browser role may access the table directly.
revoke all on table public.account_sync from anon, authenticated;
drop policy if exists "account_sync_select" on public.account_sync;
drop policy if exists "account_sync_insert" on public.account_sync;
drop policy if exists "account_sync_update" on public.account_sync;
drop policy if exists "account_sync_delete" on public.account_sync;

-- Disable the old last-write-wins RPCs so an older cached client cannot silently
-- overwrite a newer multi-device snapshot.
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
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  return query
  select s.payload,s.updated_at,s.revision
  from public.account_sync s
  where s.owner_user_id = v_uid;
end;
$$;

create or replace function public.account_sync_push_v2(
  p_payload text,
  p_expected_revision bigint
)
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
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_payload is null or length(p_payload) < 20 or length(p_payload) > 50000000 then
    raise exception 'INVALID_PAYLOAD';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'INVALID_EXPECTED_REVISION';
  end if;

  select s.revision
  into v_current
  from public.account_sync s
  where s.owner_user_id = v_uid
  for update;

  if not found then
    if p_expected_revision <> 0 then
      raise exception 'SYNC_REVISION_CONFLICT current=0 expected=%',p_expected_revision;
    end if;

    insert into public.account_sync(owner_user_id,payload,updated_at,revision)
    values(v_uid,p_payload,now(),1)
    on conflict(owner_user_id) do nothing;

    if found then
      return jsonb_build_object('ok',true,'revision',1,'created',true,'updated_at',now());
    end if;

    select s.revision into v_current from public.account_sync s where s.owner_user_id=v_uid for update;
    raise exception 'SYNC_REVISION_CONFLICT current=% expected=0',coalesce(v_current,0);
  end if;

  if v_current <> p_expected_revision then
    raise exception 'SYNC_REVISION_CONFLICT current=% expected=%',v_current,p_expected_revision;
  end if;

  v_next := v_current + 1;
  update public.account_sync
  set payload=p_payload,updated_at=now(),revision=v_next
  where owner_user_id=v_uid;

  return jsonb_build_object('ok',true,'revision',v_next,'created',false,'updated_at',now());
end;
$$;

revoke all on function public.account_sync_pull_v2() from public;
revoke all on function public.account_sync_push_v2(text,bigint) from public;
grant execute on function public.account_sync_pull_v2() to authenticated;
grant execute on function public.account_sync_push_v2(text,bigint) to authenticated;
