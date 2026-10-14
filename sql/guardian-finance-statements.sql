-- v11.5 Stage 2 — guardian finance ledger, isolated from public link snapshots.
-- ADDITIVE ONLY. Do not modify student/session data or existing guardian RPCs.
-- Run AFTER Git commit and BEFORE Push. Requires guardian-portal-login.sql in production.

create table if not exists public.guardian_finance_statements (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  student_ref text not null check (student_ref ~ '^[0-9a-f]{64}$'),
  statement jsonb not null check (jsonb_typeof(statement) = 'object'),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (owner_user_id, student_ref)
);

alter table public.guardian_finance_statements enable row level security;
revoke all on table public.guardian_finance_statements from public, anon, authenticated;

create or replace function public.guardian_finance_publish(p_student_ref text,p_statement jsonb)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'TEACHER_AUTH_REQUIRED';
  end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  if p_statement is null or jsonb_typeof(p_statement)<>'object' or p_statement->>'v'<>'1' then
    raise exception 'INVALID_STATEMENT';
  end if;
  if octet_length(p_statement::text)>45000 then raise exception 'STATEMENT_TOO_LARGE'; end if;
  -- Only a linked guardian whose access is currently active may receive finance data.
  if not exists (
    select 1 from public.guardian_portal_shares s
      join public.guardian_portal_accounts a on a.id=s.guardian_account_id
    where s.owner_user_id=v_uid and s.student_ref=p_student_ref
      and s.revoked_at is null and a.disabled_at is null
  ) then raise exception 'GUARDIAN_PIN_LINK_REQUIRED'; end if;

  insert into public.guardian_finance_statements(owner_user_id,student_ref,statement,enabled,updated_at)
  values (v_uid,p_student_ref,p_statement,true,now())
  on conflict(owner_user_id,student_ref) do update
    set statement=excluded.statement,enabled=true,updated_at=now();
  return jsonb_build_object('ok',true,'updated_at',now());
end;
$$;

create or replace function public.guardian_finance_revoke(p_student_ref text)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'TEACHER_AUTH_REQUIRED';
  end if;
  if p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  update public.guardian_finance_statements set enabled=false,updated_at=now()
    where owner_user_id=v_uid and student_ref=p_student_ref;
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.guardian_finance_session_read(p_session uuid,p_student_ref text)
returns jsonb language sql security definer stable
set search_path = public, pg_temp as $$
  select jsonb_build_object('statement',f.statement,'updated_at',f.updated_at)
  from public.guardian_portal_sessions sess
    join public.guardian_portal_shares share
      on share.guardian_account_id=any(sess.account_ids)
    join public.guardian_portal_accounts account
      on account.id=share.guardian_account_id and account.disabled_at is null
    join public.guardian_finance_statements f
      on f.owner_user_id=share.owner_user_id and f.student_ref=share.student_ref
    join public.app_users teacher on teacher.user_id=f.owner_user_id and teacher.status='active'
  where sess.session_token=p_session and sess.revoked_at is null
    and sess.expires_at>now() and share.revoked_at is null
    and f.student_ref=p_student_ref and f.enabled=true
  limit 1;
$$;

revoke all on function public.guardian_finance_publish(text,jsonb) from public;
revoke all on function public.guardian_finance_revoke(text) from public;
revoke all on function public.guardian_finance_session_read(uuid,text) from public;
grant execute on function public.guardian_finance_publish(text,jsonb) to authenticated;
grant execute on function public.guardian_finance_revoke(text) to authenticated;
grant execute on function public.guardian_finance_session_read(uuid,text) to anon,authenticated;

-- Finance is NEVER included in guardian_portal_read (public link) or data= snapshots.
-- Finance is read only by session UUID authorized for the linked guardian account.
