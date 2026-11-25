-- RC30 Data Protection & Cloud Backup
-- Additive migration. Run once in Supabase SQL Editor after the existing
-- account-sync.sql and supervision-roster-permissions.sql migrations.
-- Encrypted backups only: administrators download ciphertext JSON; the teacher's
-- sync passphrase is required to decrypt/restore it. No student data is stored in plaintext here.

begin;

do $$
begin
  if to_regclass('public.account_sync') is null then
    raise exception 'RUN_ACCOUNT_SYNC_SQL_FIRST';
  end if;
  if to_regclass('public.app_supervisor_teacher_scope') is null then
    raise exception 'RUN_SUPERVISION_ROSTER_PERMISSIONS_SQL_FIRST';
  end if;
end $$;

alter table public.account_sync
  add column if not exists student_count integer,
  add column if not exists session_count integer,
  add column if not exists task_count integer,
  add column if not exists last_backup_at timestamptz;

create table if not exists public.account_sync_backups (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  revision bigint not null,
  payload text not null,
  student_count integer,
  session_count integer,
  task_count integer,
  source_device_id text,
  created_at timestamptz not null default now()
);
create index if not exists account_sync_backups_owner_date_idx
  on public.account_sync_backups(owner_user_id,created_at desc);
alter table public.account_sync_backups enable row level security;
revoke all on public.account_sync_backups from public,anon,authenticated;

alter table public.app_supervisor_teacher_scope
  add column if not exists view_backups boolean not null default false;

create or replace function public.app_supervision_scope_check(p_actor uuid,p_teacher uuid,p_capability text)
returns boolean language sql security definer stable set search_path=public,pg_temp as $$
  select public.app_supervision_owner(p_actor) or exists(
    select 1 from public.app_users u
    join public.app_supervisor_grants g on g.supervisor_user_id=u.user_id and g.revoked_at is null
    join public.app_supervisor_teacher_scope sc on sc.supervisor_user_id=u.user_id
    join public.app_users t on t.user_id=sc.teacher_user_id and t.status='active'
    where u.user_id=p_actor and u.status='active' and t.user_id=p_teacher
    and case p_capability
      when 'students' then sc.view_students
      when 'progress' then sc.view_students and sc.view_progress
      when 'ratings' then sc.view_ratings
      when 'messages' then sc.view_messages
      when 'backups' then sc.view_backups
      else false end
  );
$$;

create or replace function public.app_supervisor_scope_get(p_supervisor_user_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
declare v_rows jsonb;
begin
  if not public.app_supervision_owner(auth.uid()) then raise exception 'OWNER_REQUIRED'; end if;
  if not exists(select 1 from public.app_users where user_id=p_supervisor_user_id and status='active' and role='teacher')
    then raise exception 'TEACHER_NOT_FOUND'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('teacher_id',t.user_id,'name',t.display_name,
    'students',coalesce(sc.view_students,false),'progress',coalesce(sc.view_progress,false),
    'ratings',coalesce(sc.view_ratings,false),'messages',coalesce(sc.view_messages,false),
    'backups',coalesce(sc.view_backups,false)) order by t.display_name),'[]'::jsonb)
  into v_rows from public.app_users t
  left join public.app_supervisor_teacher_scope sc on sc.teacher_user_id=t.user_id and sc.supervisor_user_id=p_supervisor_user_id
  where t.role='teacher' and t.status='active' and t.user_id<>p_supervisor_user_id;
  return jsonb_build_object('teachers',v_rows);
end;
$$;

create or replace function public.app_supervisor_scope_set(p_supervisor_user_id uuid,p_teacher_user_id uuid,p_permissions jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_students boolean; v_progress boolean; v_ratings boolean; v_messages boolean; v_backups boolean;
begin
  if not public.app_supervision_owner(v_actor) then raise exception 'OWNER_REQUIRED'; end if;
  if p_supervisor_user_id=p_teacher_user_id or not exists(
    select 1 from public.app_users u join public.app_supervisor_grants g on g.supervisor_user_id=u.user_id and g.revoked_at is null
    where u.user_id=p_supervisor_user_id and u.status='active' and u.role='teacher')
    or not exists(select 1 from public.app_users where user_id=p_teacher_user_id and status='active' and role='teacher')
    then raise exception 'ACTIVE_SUPERVISOR_AND_TEACHER_REQUIRED'; end if;
  if p_permissions is null or jsonb_typeof(p_permissions)<>'object' then raise exception 'INVALID_SCOPE'; end if;
  if exists(select 1 from jsonb_object_keys(p_permissions) as k
    where k not in ('students','progress','ratings','messages','backups')) then raise exception 'INVALID_SCOPE'; end if;
  if exists(select 1 from jsonb_each(p_permissions) e where jsonb_typeof(e.value)<>'boolean') then raise exception 'INVALID_SCOPE'; end if;
  v_students:=coalesce((p_permissions->>'students')::boolean,false);
  v_progress:=coalesce((p_permissions->>'progress')::boolean,false);
  v_ratings:=coalesce((p_permissions->>'ratings')::boolean,false);
  v_messages:=coalesce((p_permissions->>'messages')::boolean,false);
  v_backups:=coalesce((p_permissions->>'backups')::boolean,false);
  if v_progress and not v_students then raise exception 'STUDENT_PERMISSION_REQUIRED'; end if;
  insert into public.app_supervisor_teacher_scope(supervisor_user_id,teacher_user_id,view_students,view_progress,view_ratings,view_messages,view_backups,updated_by)
  values(p_supervisor_user_id,p_teacher_user_id,v_students,v_progress,v_ratings,v_messages,v_backups,v_actor)
  on conflict(supervisor_user_id,teacher_user_id) do update set
    view_students=excluded.view_students,view_progress=excluded.view_progress,view_ratings=excluded.view_ratings,
    view_messages=excluded.view_messages,view_backups=excluded.view_backups,updated_by=v_actor,updated_at=now();
  insert into public.app_supervisor_scope_audit(actor_user_id,supervisor_user_id,teacher_user_id,permissions)
  values(v_actor,p_supervisor_user_id,p_teacher_user_id,p_permissions);
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.app_supervision_dashboard()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_rows jsonb; v_owner boolean:=public.app_supervision_owner(auth.uid());
begin
  if not public.app_supervisor_authorized(v_actor) then raise exception 'SUPERVISOR_REQUIRED'; end if;
  insert into public.app_supervision_audit(actor_user_id,action) values(v_actor,'dashboard');
  select coalesce(jsonb_agg(jsonb_build_object('id',t.user_id,'name',t.display_name,'role',t.role,
    'can_students',v_owner or coalesce(sc.view_students,false),
    'can_progress',v_owner or (coalesce(sc.view_students,false) and coalesce(sc.view_progress,false)),
    'can_ratings',v_owner or coalesce(sc.view_ratings,false),
    'can_messages',v_owner or coalesce(sc.view_messages,false),
    'can_backups',v_owner or coalesce(sc.view_backups,false),
    'published_students',case when v_owner or coalesce(sc.view_students,false) then
       (select count(distinct s.student_ref) from public.guardian_portal_shares s where s.owner_user_id=t.user_id and s.revoked_at is null) else null end,
    'roster_students',case when v_owner or coalesce(sc.view_students,false) then
       (select count(*) from public.app_teacher_supervision_roster r
        join public.app_teacher_supervision_roster_state st on st.teacher_user_id=r.teacher_user_id and st.batch_id=r.batch_id
        where r.teacher_user_id=t.user_id) else null end,
    'roster_synced_at',case when v_owner or coalesce(sc.view_students,false) then
       (select st.synced_at from public.app_teacher_supervision_roster_state st where st.teacher_user_id=t.user_id) else null end,
    'messages',case when v_owner or coalesce(sc.view_messages,false) then
       (select count(*) from public.guardian_teacher_messages m where m.owner_user_id=t.user_id) else null end,
    'rated_guardians',case when v_owner or coalesce(sc.view_ratings,false) then
       (select count(*) from public.guardian_teacher_ratings r where r.owner_user_id=t.user_id) else null end,
    'rating_average',case when v_owner or coalesce(sc.view_ratings,false) then
       (select round(avg((r.punctuality+r.teaching+r.followup+r.kindness+r.benefit+r.clarity)::numeric/6),2)
        from public.guardian_teacher_ratings r where r.owner_user_id=t.user_id) else null end,
    'supervisor',case when v_owner then exists(select 1 from public.app_supervisor_grants gr
       where gr.supervisor_user_id=t.user_id and gr.revoked_at is null) else false end
    ) order by t.display_name),'[]'::jsonb)
  into v_rows from public.app_users t
  left join public.app_supervisor_teacher_scope sc on sc.teacher_user_id=t.user_id and sc.supervisor_user_id=v_actor
  where t.status='active' and t.role in ('teacher','owner')
    and (v_owner or (t.role='teacher' and (coalesce(sc.view_students,false) or coalesce(sc.view_ratings,false) or coalesce(sc.view_messages,false) or coalesce(sc.view_backups,false))));
  return jsonb_build_object('teachers',v_rows,'owner',v_owner);
end;
$$;

-- V3 pull returns server-side counts so the client can detect a mismatched or empty snapshot.
create or replace function public.account_sync_pull_v3()
returns table(payload text,updated_at timestamptz,revision bigint,
              student_count integer,session_count integer,task_count integer)
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  return query
    select s.payload,s.updated_at,s.revision,s.student_count,s.session_count,s.task_count
    from public.account_sync s where s.owner_user_id=v_uid;
end;
$$;

create or replace function public.account_sync_push_v3(
  p_payload text,
  p_expected_revision bigint,
  p_student_count integer,
  p_session_count integer,
  p_task_count integer,
  p_source_device_id text default null,
  p_allow_destructive boolean default false
)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();
  v_current bigint;
  v_current_students integer;
  v_current_sessions integer;
  v_current_tasks integer;
  v_existing public.account_sync%rowtype;
  v_next bigint;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_payload is null or length(p_payload)<20 or length(p_payload)>50000000
    then raise exception 'INVALID_PAYLOAD'; end if;
  if p_expected_revision is null or p_expected_revision<0
    then raise exception 'INVALID_EXPECTED_REVISION'; end if;
  if p_student_count is null or p_session_count is null or p_task_count is null
     or p_student_count<0 or p_student_count>10000
     or p_session_count<0 or p_session_count>200000
     or p_task_count<0 or p_task_count>50000
    then raise exception 'INVALID_SNAPSHOT_COUNTS'; end if;
  if p_student_count=0 and (p_session_count>0 or p_task_count>0)
    then raise exception 'INVALID_EMPTY_SNAPSHOT'; end if;
  if p_source_device_id is not null and length(p_source_device_id)>160
    then raise exception 'INVALID_DEVICE_ID'; end if;

  select s.* into v_existing from public.account_sync s
    where s.owner_user_id=v_uid for update;
  if found then
    v_current:=v_existing.revision;
    v_current_students:=v_existing.student_count;
    v_current_sessions:=v_existing.session_count;
    v_current_tasks:=v_existing.task_count;
  end if;

  if not found then
    if p_expected_revision<>0 then
      raise exception 'SYNC_REVISION_CONFLICT current=0 expected=%',p_expected_revision;
    end if;
    insert into public.account_sync(owner_user_id,payload,updated_at,revision,
      student_count,session_count,task_count,last_backup_at)
    values(v_uid,p_payload,now(),1,p_student_count,p_session_count,p_task_count,null)
    on conflict(owner_user_id) do nothing;
    if found then
      return jsonb_build_object('ok',true,'revision',1,'created',true,'updated_at',now());
    end if;
    select s.revision into v_current from public.account_sync s
      where s.owner_user_id=v_uid for update;
    raise exception 'SYNC_REVISION_CONFLICT current=% expected=0',coalesce(v_current,0);
  end if;

  if v_current<>p_expected_revision then
    raise exception 'SYNC_REVISION_CONFLICT current=% expected=%',v_current,p_expected_revision;
  end if;

  -- A transient empty local database must never erase a previously populated cloud account.
  -- An intentional full reset requires a separate, explicit user confirmation in the app.
  if not coalesce(p_allow_destructive,false) and (
       (v_current_students is null and p_student_count=0)
       or (v_current_students is not null and p_student_count<v_current_students)
       or (v_current_sessions is not null and p_session_count<v_current_sessions)
       or (v_current_tasks is not null and p_task_count<v_current_tasks)
     ) then raise exception 'DESTRUCTIVE_SYNC_CONFIRM_REQUIRED'; end if;

  -- Preserve the previous encrypted cloud state before a due daily update or any approved reduction.
  if v_existing.last_backup_at is null
     or v_existing.last_backup_at<=now()-interval '24 hours'
     or coalesce(p_allow_destructive,false) then
    insert into public.account_sync_backups(owner_user_id,revision,payload,student_count,
      session_count,task_count,source_device_id,created_at)
    values(v_uid,v_existing.revision,v_existing.payload,v_existing.student_count,
      v_existing.session_count,v_existing.task_count,null,now());
    update public.account_sync set last_backup_at=now() where owner_user_id=v_uid;
  end if;

  v_next:=v_current+1;
  update public.account_sync
    set payload=p_payload,updated_at=now(),revision=v_next,
        student_count=p_student_count,session_count=p_session_count,task_count=p_task_count
    where owner_user_id=v_uid;
  return jsonb_build_object('ok',true,'revision',v_next,'created',false,'updated_at',now());
end;
$$;

-- Legacy clients cannot push opaque v2 snapshots because the server cannot inspect
-- their record counts. Pull remains available; all writes require the guarded v3 RPC.
create or replace function public.account_sync_push_v2(p_payload text,p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  raise exception 'SYNC_CLIENT_UPGRADE_REQUIRED';
end;
$$;

create or replace function public.account_sync_backup_daily()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_uid uuid:=auth.uid();
  v_row public.account_sync%rowtype;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_row from public.account_sync
    where owner_user_id=v_uid for update;
  if not found then
    return jsonb_build_object('ok',true,'created',false,'reason','NO_CLOUD_SNAPSHOT');
  end if;
  if v_row.last_backup_at is null or v_row.last_backup_at<=now()-interval '24 hours' then
    insert into public.account_sync_backups(owner_user_id,revision,payload,student_count,
      session_count,task_count,source_device_id,created_at)
    values(v_uid,v_row.revision,v_row.payload,v_row.student_count,v_row.session_count,
      v_row.task_count,null,now());
    update public.account_sync set last_backup_at=now() where owner_user_id=v_uid;
    delete from public.account_sync_backups
      where owner_user_id=v_uid and created_at<now()-interval '90 days';
    return jsonb_build_object('ok',true,'created',true,'revision',v_row.revision,'created_at',now());
  end if;
  return jsonb_build_object('ok',true,'created',false,'last_backup_at',v_row.last_backup_at);
end;
$$;

-- Server-side daily backup job: runs even when every PWA is closed.
-- It stores the already-encrypted payload only; it never decrypts student data.
create or replace function public.account_sync_backup_all_daily()
returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_row record;
  v_created integer:=0;
begin
  for v_row in
    select owner_user_id,revision,payload,student_count,session_count,task_count
    from public.account_sync
    where last_backup_at is null or last_backup_at<=now()-interval '24 hours'
    for update skip locked
  loop
    insert into public.account_sync_backups(owner_user_id,revision,payload,student_count,
      session_count,task_count,source_device_id,created_at)
    values(v_row.owner_user_id,v_row.revision,v_row.payload,v_row.student_count,
      v_row.session_count,v_row.task_count,null,now());
    update public.account_sync set last_backup_at=now()
      where owner_user_id=v_row.owner_user_id;
    v_created:=v_created+1;
  end loop;

  delete from public.account_sync_backups
    where created_at<now()-interval '90 days';
  return jsonb_build_object('ok',true,'created',v_created,'retention_days',90);
end;
$$;
revoke all on function public.account_sync_backup_all_daily() from public,anon,authenticated;

-- Supabase projects with pg_cron enabled receive an unattended daily job at 02:15 UTC.
-- If pg_cron is unavailable, client-side daily backups continue whenever the PWA is online.
do $$
begin
  if to_regnamespace('cron') is not null then
    begin
      execute 'select cron.unschedule(jobid) from cron.job where jobname = ''wlq-daily-cloud-backups''';
      execute 'select cron.schedule(''wlq-daily-cloud-backups'',''15 2 * * *'',''select public.account_sync_backup_all_daily();'')';
      raise notice 'Daily encrypted cloud backup job scheduled at 02:15 UTC.';
    exception when others then
      raise notice 'pg_cron scheduling unavailable; client-triggered daily backups remain active: %',sqlerrm;
    end;
  else
    raise notice 'pg_cron is not enabled. Enable it in Supabase Integrations > Cron, then rerun this migration to schedule unattended daily backups.';
  end if;
end $$;

create table if not exists public.app_teacher_backup_access_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id),
  teacher_user_id uuid not null references public.app_users(user_id),
  backup_id uuid references public.account_sync_backups(id) on delete set null,
  action text not null check(action in ('list','download')),
  happened_at timestamptz not null default now()
);
create index if not exists app_teacher_backup_access_audit_date_idx
  on public.app_teacher_backup_access_audit(happened_at desc);
alter table public.app_teacher_backup_access_audit enable row level security;
revoke all on public.app_teacher_backup_access_audit from public,anon,authenticated;
revoke all on sequence public.app_teacher_backup_access_audit_id_seq from public,anon,authenticated;

create or replace function public.app_teacher_backup_list(p_teacher_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_rows jsonb; v_name text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.app_supervision_scope_check(auth.uid(),p_teacher_id,'backups')
    then raise exception 'BACKUP_SCOPE_REQUIRED'; end if;
  select display_name into v_name from public.app_users
    where user_id=p_teacher_id and status='active' and role in ('teacher','owner');
  if v_name is null then raise exception 'ACTIVE_TEACHER_NOT_FOUND'; end if;
  insert into public.app_teacher_backup_access_audit(actor_user_id,teacher_user_id,action)
    values(auth.uid(),p_teacher_id,'list');
  select coalesce(jsonb_agg(jsonb_build_object(
      'id',b.id,'revision',b.revision,'student_count',b.student_count,
      'session_count',b.session_count,'task_count',b.task_count,'created_at',b.created_at)
      order by b.created_at desc),'[]'::jsonb)
    into v_rows from (
      select * from public.account_sync_backups
      where owner_user_id=p_teacher_id order by created_at desc limit 90
    ) b;
  return jsonb_build_object('teacher_id',p_teacher_id,'teacher_name',v_name,'backups',v_rows);
end;
$$;

create or replace function public.app_teacher_backup_download(p_teacher_id uuid,p_backup_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_backup public.account_sync_backups%rowtype; v_name text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.app_supervision_scope_check(auth.uid(),p_teacher_id,'backups')
    then raise exception 'BACKUP_SCOPE_REQUIRED'; end if;
  select display_name into v_name from public.app_users
    where user_id=p_teacher_id and status='active' and role in ('teacher','owner');
  if v_name is null then raise exception 'ACTIVE_TEACHER_NOT_FOUND'; end if;
  select * into v_backup from public.account_sync_backups
    where id=p_backup_id and owner_user_id=p_teacher_id;
  if not found then raise exception 'BACKUP_NOT_FOUND'; end if;
  insert into public.app_teacher_backup_access_audit(actor_user_id,teacher_user_id,backup_id,action)
    values(auth.uid(),p_teacher_id,p_backup_id,'download');
  return jsonb_build_object(
    'format','wlq-encrypted-cloud-backup-v1','encrypted',true,
    'teacher_id',p_teacher_id,'teacher_name',v_name,'owner_user_id',p_teacher_id,
    'revision',v_backup.revision,'student_count',v_backup.student_count,
    'session_count',v_backup.session_count,'task_count',v_backup.task_count,
    'created_at',v_backup.created_at,'payload',v_backup.payload,
    'restore_requires_teacher_passphrase',true
  );
end;
$$;

revoke all on function public.account_sync_pull_v3() from public,anon;
revoke all on function public.account_sync_push_v3(text,bigint,integer,integer,integer,text,boolean) from public,anon;
revoke all on function public.account_sync_backup_daily() from public,anon;
grant execute on function public.account_sync_pull_v3() to authenticated;
grant execute on function public.account_sync_push_v3(text,bigint,integer,integer,integer,text,boolean) to authenticated;
grant execute on function public.account_sync_backup_daily() to authenticated;

revoke all on function public.app_teacher_backup_list(uuid) from public,anon;
revoke all on function public.app_teacher_backup_download(uuid,uuid) from public,anon;
grant execute on function public.app_teacher_backup_list(uuid) to authenticated;
grant execute on function public.app_teacher_backup_download(uuid,uuid) to authenticated;


-- Server-side daily backup job: runs even when every PWA is closed.
-- It stores the already-encrypted payload only; it never decrypts student data.
create or replace function public.account_sync_backup_all_daily()
returns jsonb
language plpgsql security definer set search_path=public as $
declare
  v_row record;
  v_created integer:=0;
begin
  for v_row in
    select owner_user_id,revision,payload,student_count,session_count,task_count
    from public.account_sync
    where last_backup_at is null or last_backup_at<=now()-interval '24 hours'
    for update skip locked
  loop
    insert into public.account_sync_backups(owner_user_id,revision,payload,student_count,
      session_count,task_count,source_device_id,created_at)
    values(v_row.owner_user_id,v_row.revision,v_row.payload,v_row.student_count,
      v_row.session_count,v_row.task_count,null,now());
    update public.account_sync set last_backup_at=now()
      where owner_user_id=v_row.owner_user_id;
    v_created:=v_created+1;
  end loop;

  delete from public.account_sync_backups
    where created_at<now()-interval '90 days';
  return jsonb_build_object('ok',true,'created',v_created,'retention_days',90);
end;
$;
revoke all on function public.account_sync_backup_all_daily() from public,anon,authenticated;

-- Supabase projects with pg_cron enabled receive an unattended daily job.
-- If pg_cron is unavailable, client-side daily backups continue whenever a
-- teacher's app is online; the migration remains safe and succeeds.
do $
begin
  if to_regnamespace('cron') is not null then
    execute 'select cron.unschedule(jobid) from cron.job where jobname = $1'
      using 'wlq-daily-cloud-backups';
    execute 'select cron.schedule($1,$2,$3)'
      using 'wlq-daily-cloud-backups','17 2 * * *',
        'select public.account_sync_backup_all_daily();';
  end if;
exception when undefined_table or undefined_function then
  raise notice 'pg_cron is not enabled; client-triggered daily backups remain active.';
end $;

commit;
