-- أكاديمية الإمام — RC16: تسجيل التسميع المنزلي والتعليقات الزمنية
-- Migration additive-only. Does not alter students, sessions, account_sync, or local Schema 12.
-- Requires guardian-portal-login.sql and guardian-portal-engagement.sql.
-- Private Storage bucket; guardian uploads are authorized by one-time, expiring object-path capabilities.

create table if not exists public.guardian_home_recitations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  guardian_account_id uuid not null references public.guardian_portal_accounts(id) on delete cascade,
  student_ref text not null check (student_ref ~ '^[0-9a-f]{64}$'),
  upload_token uuid not null unique default gen_random_uuid(),
  object_path text not null unique,
  mime_type text not null check (mime_type in ('audio/webm','audio/mp4','audio/ogg','audio/mpeg')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 15728640),
  duration_ms integer not null check (duration_ms between 1000 and 180000),
  assignment_surah text not null check (char_length(btrim(assignment_surah)) between 1 and 80),
  assignment_surah_number smallint not null check (assignment_surah_number between 1 and 114),
  assignment_from_ayah smallint not null check (assignment_from_ayah between 1 and 300),
  assignment_to_ayah smallint not null check (assignment_to_ayah between assignment_from_ayah and 300),
  status text not null default 'pending' check (status in ('pending','submitted','reviewed','needs_retry')),
  teacher_private_note text not null default '' check (char_length(teacher_private_note) <= 1000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  submitted_at timestamptz,
  reviewed_at timestamptz
);

create index if not exists guardian_home_recitations_owner_student_time_idx
  on public.guardian_home_recitations(owner_user_id,student_ref,created_at desc);
create index if not exists guardian_home_recitations_guardian_time_idx
  on public.guardian_home_recitations(guardian_account_id,created_at desc);
create index if not exists guardian_home_recitations_pending_idx
  on public.guardian_home_recitations(expires_at) where status='pending';

create table if not exists public.guardian_home_recitation_comments (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid not null references public.guardian_home_recitations(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  at_ms integer not null check (at_ms between 0 and 180000),
  ayah_number smallint check (ayah_number between 1 and 300),
  body text check (body is null or char_length(btrim(body)) between 1 and 1000),
  audio_path text unique,
  audio_status text not null default 'ready' check (audio_status in ('pending','ready')),
  visibility text not null default 'guardian' check (visibility in ('private','guardian')),
  created_at timestamptz not null default now(),
  constraint guardian_home_recitation_comment_content check (body is not null or audio_path is not null),
  constraint guardian_home_recitation_comment_audio_path check (
    audio_path is null or audio_path ~ '^teacher/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|m4a|ogg|mp3)$'
  )
);

alter table public.guardian_home_recitation_comments add column if not exists ayah_number smallint;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='guardian_home_recitation_comment_ayah_check' and conrelid='public.guardian_home_recitation_comments'::regclass) then
    alter table public.guardian_home_recitation_comments add constraint guardian_home_recitation_comment_ayah_check check (ayah_number is null or ayah_number between 1 and 300);
  end if;
end $$;

create index if not exists guardian_home_recitation_comments_recording_idx
  on public.guardian_home_recitation_comments(recording_id,at_ms,created_at);

alter table public.guardian_home_recitations enable row level security;
alter table public.guardian_home_recitation_comments enable row level security;
revoke all on table public.guardian_home_recitations from public,anon,authenticated;
revoke all on table public.guardian_home_recitation_comments from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'guardian-recitation-media',
  'guardian-recitation-media',
  false,
  15728640,
  array['audio/webm','audio/mp4','audio/ogg','audio/mpeg']::text[]
)
on conflict(id) do update set
  name=excluded.name,
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.guardian_home_recitation_parent_upload_allowed(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.guardian_home_recitations r
    join public.guardian_portal_shares sh on sh.owner_user_id=r.owner_user_id
      and sh.guardian_account_id=r.guardian_account_id and sh.student_ref=r.student_ref
    join public.guardian_portal_accounts a on a.id=sh.guardian_account_id and a.disabled_at is null
    where r.object_path=p_name and r.status='pending' and r.expires_at>now()
  );
$$;

create or replace function public.guardian_home_recitation_teacher_upload_allowed(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and exists(select 1 from public.app_users u where u.user_id=auth.uid() and u.status='active')
    and exists(
      select 1 from public.guardian_home_recitation_comments c
      where c.audio_path=p_name and c.owner_user_id=auth.uid() and c.audio_status='pending'
    );
$$;

create or replace function public.guardian_home_recitation_can_read(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.guardian_home_recitations r
    left join public.guardian_portal_shares sh on sh.owner_user_id=r.owner_user_id
      and sh.guardian_account_id=r.guardian_account_id and sh.student_ref=r.student_ref
    left join public.guardian_portal_accounts a on a.id=sh.guardian_account_id
    where r.object_path=p_name and r.status in ('submitted','reviewed','needs_retry')
      and (
        (auth.uid() is null and sh.guardian_account_id is not null and a.disabled_at is null)
        or r.owner_user_id=auth.uid()
      )
  ) or exists(
    select 1 from public.guardian_home_recitation_comments c
    join public.guardian_home_recitations r on r.id=c.recording_id
    left join public.guardian_portal_shares sh on sh.owner_user_id=r.owner_user_id
      and sh.guardian_account_id=r.guardian_account_id and sh.student_ref=r.student_ref
    left join public.guardian_portal_accounts a on a.id=sh.guardian_account_id
    where c.audio_path=p_name and c.audio_status='ready'
      and (
        (auth.uid() is null and c.visibility='guardian' and sh.guardian_account_id is not null and a.disabled_at is null)
        or c.owner_user_id=auth.uid()
      )
  );
$$;

revoke all on function public.guardian_home_recitation_parent_upload_allowed(text) from public;
revoke all on function public.guardian_home_recitation_teacher_upload_allowed(text) from public;
revoke all on function public.guardian_home_recitation_can_read(text) from public;
grant execute on function public.guardian_home_recitation_parent_upload_allowed(text) to anon,authenticated;
grant execute on function public.guardian_home_recitation_teacher_upload_allowed(text) to anon,authenticated;
grant execute on function public.guardian_home_recitation_can_read(text) to anon,authenticated;

drop policy if exists guardian_home_recitation_media_insert on storage.objects;
drop policy if exists guardian_home_recitation_media_select on storage.objects;
create policy guardian_home_recitation_media_insert on storage.objects
for insert to anon,authenticated
with check (
  bucket_id='guardian-recitation-media'
  and (
    public.guardian_home_recitation_parent_upload_allowed(name)
    or public.guardian_home_recitation_teacher_upload_allowed(name)
  )
);
create policy guardian_home_recitation_media_select on storage.objects
for select to anon,authenticated
using (
  bucket_id='guardian-recitation-media'
  and public.guardian_home_recitation_can_read(name)
);

create or replace function public.guardian_home_recitation_begin_upload(
  p_session uuid,
  p_student_ref text,
  p_mime_type text,
  p_file_size_bytes integer,
  p_duration_ms integer,
  p_surah text,
  p_surah_number integer,
  p_from_ayah integer,
  p_to_ayah integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, storage, pg_temp
as $$
declare
  v_owner uuid;
  v_account uuid;
  v_id uuid := gen_random_uuid();
  v_token uuid := gen_random_uuid();
  v_ext text;
  v_path text;
begin
  if p_session is null or p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_REQUEST'; end if;
  if p_mime_type is null or p_mime_type not in ('audio/webm','audio/mp4','audio/ogg','audio/mpeg') then raise exception 'UNSUPPORTED_AUDIO_TYPE'; end if;
  if p_file_size_bytes is null or p_file_size_bytes not between 1 and 15728640 then raise exception 'AUDIO_SIZE_LIMIT'; end if;
  if p_duration_ms is null or p_duration_ms not between 1000 and 180000 then raise exception 'AUDIO_DURATION_LIMIT'; end if;
  if p_surah is null or char_length(btrim(p_surah)) not between 1 and 80
    or p_surah_number is null or p_surah_number not between 1 and 114
    or p_from_ayah is null or p_from_ayah not between 1 and 300
    or p_to_ayah is null or p_to_ayah not between p_from_ayah and 300 then raise exception 'INVALID_ASSIGNMENT_RANGE'; end if;

  select s.owner_user_id,s.guardian_account_id into v_owner,v_account
  from public.guardian_portal_sessions sess
  join public.guardian_portal_shares s on s.guardian_account_id=any(sess.account_ids)
  join public.guardian_portal_accounts a on a.id=s.guardian_account_id and a.disabled_at is null
  join public.app_users u on u.user_id=s.owner_user_id and u.status='active'
  where sess.session_token=p_session and sess.revoked_at is null and sess.expires_at>now()
    and s.student_ref=p_student_ref and s.guardian_account_id is not null
  limit 1;
  if v_owner is null or v_account is null then raise exception 'GUARDIAN_SESSION_REQUIRED'; end if;

  if not exists(
    select 1 from public.guardian_portal_shares sh
    where sh.guardian_account_id=v_account and sh.student_ref=p_student_ref
      and sh.snapshot#>>'{learning,newAssignment,surah}'=btrim(p_surah)
      and coalesce((sh.snapshot#>>'{learning,newAssignment,surahNumber}')::integer,0)=p_surah_number
      and coalesce((sh.snapshot#>>'{learning,newAssignment,from}')::integer,1)=p_from_ayah
      and coalesce((sh.snapshot#>>'{learning,newAssignment,to}')::integer,1)=p_to_ayah
  ) then raise exception 'ASSIGNMENT_NOT_CURRENT'; end if;

  if (select count(*) from public.guardian_home_recitations r
      where r.guardian_account_id=v_account and r.student_ref=p_student_ref and r.created_at>now()-interval '24 hours'
        and r.status in ('pending','submitted','reviewed','needs_retry')
        and (r.status<>'pending' or r.expires_at>now())) >= 5
  then raise exception 'DAILY_UPLOAD_LIMIT'; end if;

  v_ext := case p_mime_type when 'audio/mp4' then 'm4a' when 'audio/ogg' then 'ogg' when 'audio/mpeg' then 'mp3' else 'webm' end;
  v_path := 'parent/'||v_token::text||'.'||v_ext;
  insert into public.guardian_home_recitations(
    id,owner_user_id,guardian_account_id,student_ref,upload_token,object_path,mime_type,
    file_size_bytes,duration_ms,assignment_surah,assignment_surah_number,assignment_from_ayah,assignment_to_ayah
  ) values (
    v_id,v_owner,v_account,p_student_ref,v_token,v_path,p_mime_type,
    p_file_size_bytes,p_duration_ms,btrim(p_surah),p_surah_number,p_from_ayah,p_to_ayah
  );
  return jsonb_build_object('ok',true,'id',v_id,'upload_token',v_token,'object_path',v_path,'bucket','guardian-recitation-media');
end;
$$;

create or replace function public.guardian_home_recitation_complete_upload(
  p_session uuid,p_student_ref text,p_upload_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare v_row public.guardian_home_recitations%rowtype;
begin
  select r.* into v_row
  from public.guardian_home_recitations r
  join public.guardian_portal_sessions sess on sess.session_token=p_session
  join public.guardian_portal_shares sh on sh.owner_user_id=r.owner_user_id and sh.guardian_account_id=r.guardian_account_id and sh.student_ref=r.student_ref
  join public.guardian_portal_accounts a on a.id=sh.guardian_account_id and a.disabled_at is null
  join public.app_users u on u.user_id=r.owner_user_id and u.status='active'
  where r.upload_token=p_upload_token and r.student_ref=p_student_ref
    and r.guardian_account_id=any(sess.account_ids)
    and sess.revoked_at is null and sess.expires_at>now()
    and sh.snapshot#>>'{learning,newAssignment,surah}'=v_row.assignment_surah
    and coalesce((sh.snapshot#>>'{learning,newAssignment,surahNumber}')::integer,0)=v_row.assignment_surah_number
    and coalesce((sh.snapshot#>>'{learning,newAssignment,from}')::integer,1)=v_row.assignment_from_ayah
    and coalesce((sh.snapshot#>>'{learning,newAssignment,to}')::integer,1)=v_row.assignment_to_ayah
    and r.status='pending' and r.expires_at>now()
  for update;
  if not found then raise exception 'UPLOAD_NOT_AUTHORIZED_OR_EXPIRED'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='guardian-recitation-media' and o.name=v_row.object_path) then
    raise exception 'AUDIO_OBJECT_MISSING';
  end if;
  update public.guardian_home_recitations set status='submitted',submitted_at=now(),expires_at=now()+interval '365 days'
  where id=v_row.id;
  return jsonb_build_object('ok',true,'id',v_row.id,'status','submitted');
end;
$$;

create or replace function public.guardian_home_recitation_session_list(p_session uuid,p_student_ref text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare v_account uuid;
begin
  if p_session is null or p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_REQUEST'; end if;
  select s.guardian_account_id into v_account
  from public.guardian_portal_sessions sess
  join public.guardian_portal_shares s on s.guardian_account_id=any(sess.account_ids)
  join public.guardian_portal_accounts a on a.id=s.guardian_account_id and a.disabled_at is null
  join public.app_users u on u.user_id=s.owner_user_id and u.status='active'
  where sess.session_token=p_session and sess.revoked_at is null and sess.expires_at>now()
    and s.student_ref=p_student_ref and s.guardian_account_id is not null
  limit 1;
  if v_account is null then raise exception 'GUARDIAN_SESSION_REQUIRED'; end if;
  return jsonb_build_object('recordings',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',r.id,'object_path',r.object_path,'duration_ms',r.duration_ms,'mime_type',r.mime_type,
      'assignment_surah',r.assignment_surah,'assignment_surah_number',r.assignment_surah_number,
      'assignment_from_ayah',r.assignment_from_ayah,'assignment_to_ayah',r.assignment_to_ayah,
      'status',r.status,'created_at',r.created_at,'submitted_at',r.submitted_at,'reviewed_at',r.reviewed_at,
      'comments',coalesce((
        select jsonb_agg(jsonb_build_object('id',c.id,'at_ms',c.at_ms,'ayah_number',c.ayah_number,'body',c.body,'audio_path',c.audio_path,'created_at',c.created_at)
          order by c.at_ms,c.created_at)
        from public.guardian_home_recitation_comments c
        where c.recording_id=r.id and c.visibility='guardian' and c.audio_status='ready'
      ),'[]'::jsonb)
    ) order by r.created_at desc)
    from (
      select * from public.guardian_home_recitations
      where guardian_account_id=v_account and student_ref=p_student_ref
        and status in ('submitted','reviewed','needs_retry')
      order by created_at desc limit 20
    ) r
  ),'[]'::jsonb));
end;
$$;

create or replace function public.guardian_home_recitation_teacher_list(p_student_ref text default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists(select 1 from public.app_users where user_id=v_uid and status='active') then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  if p_student_ref is not null and p_student_ref !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STUDENT_REF'; end if;
  return jsonb_build_object('recordings',coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',r.id,'student_ref',r.student_ref,'student_name',coalesce(sh.snapshot#>>'{student,name}','طالب'),
      'duration_ms',r.duration_ms,'mime_type',r.mime_type,'object_path',r.object_path,
      'assignment_surah',r.assignment_surah,'assignment_surah_number',r.assignment_surah_number,
      'assignment_from_ayah',r.assignment_from_ayah,'assignment_to_ayah',r.assignment_to_ayah,
      'status',r.status,'teacher_private_note',r.teacher_private_note,
      'created_at',r.created_at,'submitted_at',r.submitted_at,'reviewed_at',r.reviewed_at,
      'comments',coalesce((
        select jsonb_agg(jsonb_build_object('id',c.id,'at_ms',c.at_ms,'ayah_number',c.ayah_number,'body',c.body,'audio_path',c.audio_path,'visibility',c.visibility,'audio_status',c.audio_status,'created_at',c.created_at)
          order by c.at_ms,c.created_at)
        from public.guardian_home_recitation_comments c where c.recording_id=r.id and c.owner_user_id=v_uid and c.audio_status='ready'
      ),'[]'::jsonb)
    ) order by r.created_at desc)
    from (select * from public.guardian_home_recitations where owner_user_id=v_uid
      and (p_student_ref is null or student_ref=p_student_ref)
      and status in ('submitted','reviewed','needs_retry')
      order by created_at desc limit 100) r
    left join public.guardian_portal_shares sh on sh.owner_user_id=r.owner_user_id and sh.student_ref=r.student_ref
  ),'[]'::jsonb));
end;
$$;

create or replace function public.guardian_home_recitation_teacher_review(
  p_recording_id uuid,p_status text,p_private_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null or not exists(select 1 from public.app_users where user_id=v_uid and status='active') then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  if p_status is null or p_status not in ('reviewed','needs_retry') then raise exception 'INVALID_REVIEW_STATUS'; end if;
  if char_length(coalesce(p_private_note,''))>1000 then raise exception 'NOTE_TOO_LONG'; end if;
  update public.guardian_home_recitations set status=p_status,teacher_private_note=coalesce(p_private_note,''),reviewed_at=now()
  where id=p_recording_id and owner_user_id=v_uid and status in ('submitted','reviewed','needs_retry') returning id into v_id;
  if v_id is null then raise exception 'RECORDING_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true,'id',v_id,'status',p_status);
end;
$$;

create or replace function public.guardian_home_recitation_comment_add(
  p_recording_id uuid,p_at_ms integer,p_body text,p_visibility text default 'guardian',p_ayah integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_duration integer; v_from integer; v_to integer; v_id uuid;
begin
  if v_uid is null or not exists(select 1 from public.app_users where user_id=v_uid and status='active') then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  if p_visibility is null or p_visibility not in ('private','guardian') then raise exception 'INVALID_VISIBILITY'; end if;
  if p_body is null or char_length(btrim(p_body)) not between 1 and 1000 then raise exception 'INVALID_COMMENT'; end if;
  select duration_ms,assignment_from_ayah,assignment_to_ayah into v_duration,v_from,v_to from public.guardian_home_recitations
  where id=p_recording_id and owner_user_id=v_uid and status in ('submitted','reviewed','needs_retry');
  if v_duration is null then raise exception 'RECORDING_NOT_FOUND'; end if;
  if p_at_ms is null or p_at_ms<0 or p_at_ms>v_duration then raise exception 'INVALID_TIMESTAMP'; end if;
  if p_ayah is not null and (p_ayah<v_from or p_ayah>v_to) then raise exception 'AYAH_OUTSIDE_ASSIGNMENT'; end if;
  insert into public.guardian_home_recitation_comments(recording_id,owner_user_id,at_ms,ayah_number,body,visibility)
  values(p_recording_id,v_uid,p_at_ms,p_ayah,btrim(p_body),p_visibility) returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end;
$$;

create or replace function public.guardian_home_recitation_comment_begin(
  p_recording_id uuid,p_at_ms integer,p_visibility text default 'guardian',p_ayah integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_duration integer; v_from integer; v_to integer; v_id uuid := gen_random_uuid(); v_path text;
begin
  if v_uid is null or not exists(select 1 from public.app_users where user_id=v_uid and status='active') then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  if p_visibility is null or p_visibility not in ('private','guardian') then raise exception 'INVALID_VISIBILITY'; end if;
  select duration_ms,assignment_from_ayah,assignment_to_ayah into v_duration,v_from,v_to from public.guardian_home_recitations
  where id=p_recording_id and owner_user_id=v_uid and status in ('submitted','reviewed','needs_retry');
  if v_duration is null then raise exception 'RECORDING_NOT_FOUND'; end if;
  if p_at_ms is null or p_at_ms<0 or p_at_ms>v_duration then raise exception 'INVALID_TIMESTAMP'; end if;
  if p_ayah is not null and (p_ayah<v_from or p_ayah>v_to) then raise exception 'AYAH_OUTSIDE_ASSIGNMENT'; end if;
  v_path:='teacher/'||v_uid::text||'/'||v_id::text||'.webm';
  insert into public.guardian_home_recitation_comments(id,recording_id,owner_user_id,at_ms,ayah_number,audio_path,audio_status,visibility)
  values(v_id,p_recording_id,v_uid,p_at_ms,p_ayah,v_path,'pending',p_visibility);
  return jsonb_build_object('ok',true,'id',v_id,'audio_path',v_path,'bucket','guardian-recitation-media');
end;
$$;

create or replace function public.guardian_home_recitation_comment_finish(p_comment_id uuid,p_body text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_path text; v_id uuid;
begin
  if v_uid is null or not exists(select 1 from public.app_users where user_id=v_uid and status='active') then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  if p_body is not null and char_length(btrim(p_body))>1000 then raise exception 'NOTE_TOO_LONG'; end if;
  select audio_path into v_path from public.guardian_home_recitation_comments
  where id=p_comment_id and owner_user_id=v_uid and audio_status='pending' for update;
  if v_path is null then raise exception 'COMMENT_UPLOAD_NOT_FOUND'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='guardian-recitation-media' and o.name=v_path) then raise exception 'COMMENT_AUDIO_MISSING'; end if;
  update public.guardian_home_recitation_comments
  set audio_status='ready',body=nullif(btrim(coalesce(p_body,'')),'')
  where id=p_comment_id and owner_user_id=v_uid returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end;
$$;

revoke all on function public.guardian_home_recitation_begin_upload(uuid,text,text,integer,integer,text,integer,integer,integer) from public;
revoke all on function public.guardian_home_recitation_complete_upload(uuid,text,uuid) from public;
revoke all on function public.guardian_home_recitation_session_list(uuid,text) from public;
revoke all on function public.guardian_home_recitation_teacher_list(text) from public;
revoke all on function public.guardian_home_recitation_teacher_review(uuid,text,text) from public;
revoke all on function public.guardian_home_recitation_comment_add(uuid,integer,text,text,integer) from public;
revoke all on function public.guardian_home_recitation_comment_begin(uuid,integer,text,integer) from public;
revoke all on function public.guardian_home_recitation_comment_finish(uuid,text) from public;
grant execute on function public.guardian_home_recitation_begin_upload(uuid,text,text,integer,integer,text,integer,integer,integer) to anon,authenticated;
grant execute on function public.guardian_home_recitation_complete_upload(uuid,text,uuid) to anon,authenticated;
grant execute on function public.guardian_home_recitation_session_list(uuid,text) to anon,authenticated;
grant execute on function public.guardian_home_recitation_teacher_list(text) to authenticated;
grant execute on function public.guardian_home_recitation_teacher_review(uuid,text,text) to authenticated;
grant execute on function public.guardian_home_recitation_comment_add(uuid,integer,text,text,integer) to authenticated;
grant execute on function public.guardian_home_recitation_comment_begin(uuid,integer,text,integer) to authenticated;
grant execute on function public.guardian_home_recitation_comment_finish(uuid,text) to authenticated;

-- Security notes:
-- • No direct table access is granted to browser roles.
-- • Parent uploads require a live phone+PIN session and a one-time expiring UUID object path.
-- • Parent can read only submitted recordings and teacher comments explicitly marked guardian-visible.
-- • Teacher can read only recordings owned by auth.uid(); voice feedback uploads require a pending comment row.
-- • No recording is auto-graded, auto-scored, or auto-published as an achievement.
-- • Local app Schema stays 12; this migration adds backend tables and one private bucket only.
