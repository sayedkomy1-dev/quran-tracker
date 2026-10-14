-- v11.6.0 Stage 1: parent <-> teacher messages, ADDITIVE ONLY.
-- Depends on guardian-portal-login.sql. No modifications to students, sessions,
-- existing guardian/finance tables, or their security-definer functions.

create table if not exists public.guardian_teacher_messages (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  student_ref text not null check (student_ref ~ '^[0-9a-f]{64}$'),
  guardian_account_id uuid not null references public.guardian_portal_accounts(id) on delete cascade,
  category text not null check (category in ('educational','absence','finance','schedule','general')),
  message_body text not null check (char_length(btrim(message_body)) between 1 and 2000),
  status text not null default 'new' check (status in ('new','read','replied')),
  reply_body text check (reply_body is null or char_length(btrim(reply_body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  replied_at timestamptz
);
create index if not exists guardian_messages_teacher_idx
  on public.guardian_teacher_messages(owner_user_id,created_at desc);
create index if not exists guardian_messages_family_idx
  on public.guardian_teacher_messages(guardian_account_id,student_ref,created_at desc);
alter table public.guardian_teacher_messages enable row level security;
revoke all on table public.guardian_teacher_messages from public, anon, authenticated;

-- Session UUID is a short-lived bearer credential issued after phone+PIN verification.
-- A public #data or #p link cannot send messages.
create or replace function public.guardian_message_send(
  p_session uuid, p_student_ref text, p_category text, p_body text
) returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_owner uuid; v_account uuid; v_message uuid; v_text text := btrim(coalesce(p_body,''));
begin
  if p_session is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_REQUEST'; end if;
  if p_category is null or p_category not in ('educational','absence','finance','schedule','general') then raise exception 'INVALID_CATEGORY'; end if;
  if char_length(v_text) not between 1 and 2000 then raise exception 'INVALID_MESSAGE_LENGTH'; end if;
  select sh.owner_user_id,sh.guardian_account_id into v_owner,v_account
  from public.guardian_portal_sessions sess
  join public.guardian_portal_shares sh on sh.guardian_account_id=any(sess.account_ids)
  join public.guardian_portal_accounts ac on ac.id=sh.guardian_account_id and ac.disabled_at is null
  join public.app_users teacher on teacher.user_id=sh.owner_user_id and teacher.status='active'
  where sess.session_token=p_session and sess.revoked_at is null and sess.expires_at>now()
    and sh.student_ref=p_student_ref and sh.guardian_account_id is not null
  limit 1;
  if v_owner is null then raise exception 'GUARDIAN_SESSION_REQUIRED'; end if;
  -- Simple per-account limits. Do not store IP, user agent, phone or PIN.
  if (select count(*) from public.guardian_teacher_messages
      where guardian_account_id=v_account and created_at>now()-interval '15 minutes')>=5
    or (select count(*) from public.guardian_teacher_messages
      where guardian_account_id=v_account and created_at>now()-interval '1 day')>=30
  then raise exception 'MESSAGE_RATE_LIMIT'; end if;
  insert into public.guardian_teacher_messages(owner_user_id,student_ref,guardian_account_id,category,message_body)
  values(v_owner,p_student_ref,v_account,p_category,v_text) returning id into v_message;
  return jsonb_build_object('ok',true,'id',v_message);
end;
$$;

create or replace function public.guardian_message_session_list(p_session uuid,p_student_ref text)
returns jsonb language plpgsql security definer stable
set search_path = public, pg_temp as $$
declare v_owner uuid; v_account uuid;
begin
  if p_session is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_REQUEST'; end if;
  select sh.owner_user_id,sh.guardian_account_id into v_owner,v_account
  from public.guardian_portal_sessions sess
  join public.guardian_portal_shares sh on sh.guardian_account_id=any(sess.account_ids)
  join public.guardian_portal_accounts ac on ac.id=sh.guardian_account_id and ac.disabled_at is null
  join public.app_users teacher on teacher.user_id=sh.owner_user_id and teacher.status='active'
  where sess.session_token=p_session and sess.revoked_at is null and sess.expires_at>now()
    and sh.student_ref=p_student_ref and sh.guardian_account_id is not null
  limit 1;
  if v_owner is null then raise exception 'GUARDIAN_SESSION_REQUIRED'; end if;
  return jsonb_build_object('messages',coalesce((
    select jsonb_agg(jsonb_build_object('id',m.id,'category',m.category,
      'message',m.message_body,'status',m.status,'reply',m.reply_body,
      'created_at',m.created_at,'replied_at',m.replied_at) order by m.created_at desc)
    from (select * from public.guardian_teacher_messages
      where owner_user_id=v_owner and guardian_account_id=v_account and student_ref=p_student_ref
      order by created_at desc limit 60) m
  ),'[]'::jsonb));
end;
$$;

create or replace function public.guardian_message_teacher_list(p_student_ref text default null)
returns jsonb language plpgsql security definer stable
set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists(select 1 from public.app_users where user_id=v_uid and status='active')
  then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  if p_student_ref is not null and p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  return jsonb_build_object('messages',coalesce((
    select jsonb_agg(jsonb_build_object('id',m.id,'student_ref',m.student_ref,
      'student_name',coalesce(sh.snapshot#>>'{student,name}','طالب'),
      'guardian_name',coalesce(sh.snapshot#>>'{student,guardian}','ولي الأمر'),
      'category',m.category,'message',m.message_body,'status',m.status,'reply',m.reply_body,
      'created_at',m.created_at,'read_at',m.read_at,'replied_at',m.replied_at)
      order by m.created_at desc)
    from (select * from public.guardian_teacher_messages
      where owner_user_id=v_uid and (p_student_ref is null or student_ref=p_student_ref)
      order by created_at desc limit 150) m
    left join public.guardian_portal_shares sh
      on sh.owner_user_id=m.owner_user_id and sh.student_ref=m.student_ref
  ),'[]'::jsonb));
end;
$$;

create or replace function public.guardian_message_mark_read(p_message_id uuid)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null or not exists(select 1 from public.app_users where user_id=v_uid and status='active')
  then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  update public.guardian_teacher_messages
  set status='read',read_at=coalesce(read_at,now())
  where id=p_message_id and owner_user_id=v_uid and status='new' returning id into v_id;
  if v_id is null and not exists(select 1 from public.guardian_teacher_messages where id=p_message_id and owner_user_id=v_uid)
    then raise exception 'MESSAGE_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.guardian_message_reply(p_message_id uuid,p_body text)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid(); v_body text := btrim(coalesce(p_body,'')); v_id uuid;
begin
  if v_uid is null or not exists(select 1 from public.app_users where user_id=v_uid and status='active')
  then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  if char_length(v_body) not between 1 and 2000 then raise exception 'INVALID_REPLY_LENGTH'; end if;
  -- Never overwrite a prior reply silently; first reply remains auditable.
  update public.guardian_teacher_messages
  set status='replied',reply_body=v_body,read_at=coalesce(read_at,now()),replied_at=now()
  where id=p_message_id and owner_user_id=v_uid and status in ('new','read') and reply_body is null
  returning id into v_id;
  if v_id is null then raise exception 'MESSAGE_NOT_FOUND_OR_ALREADY_REPLIED'; end if;
  return jsonb_build_object('ok',true);
end;
$$;

revoke all on function public.guardian_message_send(uuid,text,text,text) from public;
revoke all on function public.guardian_message_session_list(uuid,text) from public;
revoke all on function public.guardian_message_teacher_list(text) from public;
revoke all on function public.guardian_message_mark_read(uuid) from public;
revoke all on function public.guardian_message_reply(uuid,text) from public;
grant execute on function public.guardian_message_send(uuid,text,text,text) to anon,authenticated;
grant execute on function public.guardian_message_session_list(uuid,text) to anon,authenticated;
grant execute on function public.guardian_message_teacher_list(text) to authenticated;
grant execute on function public.guardian_message_mark_read(uuid) to authenticated;
grant execute on function public.guardian_message_reply(uuid,text) to authenticated;
