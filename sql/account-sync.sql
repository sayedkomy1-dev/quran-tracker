-- We Live Quran v10.1.3
-- Account-owned encrypted cloud backup.
-- The browser encrypts payloads before upload. Supabase only sees ciphertext.

create table if not exists public.account_sync (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  payload text not null,
  updated_at timestamptz not null default now()
);

alter table public.account_sync enable row level security;

-- No browser role may read/write the table directly.
revoke all on table public.account_sync from anon, authenticated;

drop policy if exists "account_sync_select" on public.account_sync;
drop policy if exists "account_sync_insert" on public.account_sync;
drop policy if exists "account_sync_update" on public.account_sync;
drop policy if exists "account_sync_delete" on public.account_sync;

create or replace function public.account_sync_push(p_payload text)
returns jsonb
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
  if p_payload is null or length(p_payload) < 20 or length(p_payload) > 50000000 then
    raise exception 'INVALID_PAYLOAD';
  end if;

  insert into public.account_sync(owner_user_id,payload,updated_at)
  values(v_uid,p_payload,now())
  on conflict(owner_user_id)
  do update set payload=excluded.payload,updated_at=excluded.updated_at;

  return jsonb_build_object('ok',true,'updated_at',now());
end;
$$;

create or replace function public.account_sync_pull()
returns table(payload text, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select s.payload,s.updated_at
  from public.account_sync s
  where s.owner_user_id = auth.uid();
$$;

revoke all on function public.account_sync_push(text) from public;
revoke all on function public.account_sync_pull() from public;
grant execute on function public.account_sync_push(text) to authenticated;
grant execute on function public.account_sync_pull() to authenticated;
