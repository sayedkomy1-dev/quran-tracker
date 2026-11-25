-- v11.7.3 — Owner academy oversight + scoped supervisor permissions.
-- ADDITIVE ONLY: does not delete/reset student, session, finance, or legacy guardian data.
-- Existing RPCs are replaced in place ONLY to enforce narrower scope for supervisors.
-- Teacher roster is an EXPLICIT, read-only administrative publication; no phone/PIN/finance.

alter table public.app_supervisor_teacher_scope add column if not exists view_backups boolean not null default false;

create table if not exists public.app_teacher_supervision_roster (
  teacher_user_id uuid not null references public.app_users(user_id),
  student_ref text not null check (student_ref ~ '^[0-9a-f]{64}$'),
  student_name text not null check (char_length(student_name) between 1 and 120),
  group_name text not null default '' check (char_length(group_name)<=100),
  level_name text not null default '' check (char_length(level_name)<=80),
  present_count integer not null default 0 check (present_count between 0 and 100000),
  absent_count integer not null default 0 check (absent_count between 0 and 100000),
  batch_id uuid not null,
  updated_at timestamptz not null default now(),
  primary key (teacher_user_id,student_ref)
);
create table if not exists public.app_teacher_supervision_roster_state (
  teacher_user_id uuid primary key references public.app_users(user_id),
  batch_id uuid not null,
  synced_at timestamptz not null default now()
);
create table if not exists public.app_supervisor_teacher_scope (
  supervisor_user_id uuid not null references public.app_users(user_id),
  teacher_user_id uuid not null references public.app_users(user_id),
  view_students boolean not null default false,
  view_progress boolean not null default false,
  view_ratings boolean not null default false,
  view_messages boolean not null default false,
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (supervisor_user_id,teacher_user_id)
);
create table if not exists public.app_supervisor_scope_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id),
  supervisor_user_id uuid not null references public.app_users(user_id),
  teacher_user_id uuid not null references public.app_users(user_id),
  permissions jsonb not null,
  happened_at timestamptz not null default now()
);
create index if not exists app_supervisor_scope_audit_idx on public.app_supervisor_scope_audit(happened_at desc);

alter table public.app_teacher_supervision_roster enable row level security;
alter table public.app_teacher_supervision_roster_state enable row level security;
alter table public.app_supervisor_teacher_scope enable row level security;
alter table public.app_supervisor_scope_audit enable row level security;
revoke all on public.app_teacher_supervision_roster from public,anon,authenticated;
revoke all on public.app_teacher_supervision_roster_state from public,anon,authenticated;
revoke all on public.app_supervisor_teacher_scope from public,anon,authenticated;
revoke all on public.app_supervisor_scope_audit from public,anon,authenticated;

create or replace function public.app_supervision_owner(p_actor uuid)
returns boolean language sql security definer stable set search_path=public,pg_temp as $$
  select exists(select 1 from public.app_users u where u.user_id=p_actor and u.role='owner' and u.status='active');
$$;

create or replace function public.app_supervision_scope_check(p_actor uuid,p_teacher uuid,p_capability text)
returns boolean language sql security definer stable set search_path=public,pg_temp as $
  select public.app_supervision_owner(p_actor) or exists(
    select 1 from public.app_users u join public.app_supervisor_grants g on g.supervisor_user_id=u.user_id and g.revoked_at is null
    join public.app_supervisor_teacher_scope sc on sc.supervisor_user_id=u.user_id
    join public.app_users t on t.user_id=sc.teacher_user_id and t.status='active'
    where u.user_id=p_actor and u.status='active' and t.user_id=p_teacher
    and case p_capability when 'students' then sc.view_students when 'progress' then sc.view_students and sc.view_progress
      when 'ratings' then sc.view_ratings when 'messages' then sc.view_messages when 'backups' then sc.view_backups else false end
  );
$;

create or replace function public.app_teacher_roster_publish(p_students jsonb,p_batch uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_row jsonb; v_count integer; v_ref text; v_name text;
begin
  if v_actor is null or not exists(select 1 from public.app_users where user_id=v_actor and status='active' and role in ('owner','teacher'))
    then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  if p_batch is null or p_students is null or jsonb_typeof(p_students)<>'array' or octet_length(p_students::text)>180000
    then raise exception 'INVALID_ROSTER'; end if;
  v_count:=jsonb_array_length(p_students);
  if v_count<1 then raise exception 'EMPTY_ROSTER_NOT_ALLOWED'; end if;
  if v_count>500 then raise exception 'ROSTER_TOO_LARGE'; end if;
  for v_row in select value from jsonb_array_elements(p_students) loop
    v_ref:=v_row->>'ref'; v_name:=btrim(coalesce(v_row->>'name',''));
    if v_ref is null or v_ref !~ '^[0-9a-f]{64}$' or char_length(v_name) not between 1 and 120
      or char_length(coalesce(v_row->>'group',''))>100 or char_length(coalesce(v_row->>'level',''))>80
      or coalesce(v_row->>'present','0') !~ '^[0-9]{1,5}$' or coalesce(v_row->>'absent','0') !~ '^[0-9]{1,5}$'
      then raise exception 'INVALID_ROSTER_STUDENT'; end if;
    insert into public.app_teacher_supervision_roster(teacher_user_id,student_ref,student_name,group_name,level_name,present_count,absent_count,batch_id)
    values(v_actor,v_ref,v_name,coalesce(v_row->>'group',''),coalesce(v_row->>'level',''),
      coalesce(v_row->>'present','0')::integer,coalesce(v_row->>'absent','0')::integer,p_batch)
    on conflict(teacher_user_id,student_ref) do update set
      student_name=excluded.student_name,group_name=excluded.group_name,level_name=excluded.level_name,
      present_count=excluded.present_count,absent_count=excluded.absent_count,batch_id=excluded.batch_id,updated_at=now();
  end loop;
  insert into public.app_teacher_supervision_roster_state(teacher_user_id,batch_id)
  values(v_actor,p_batch) on conflict(teacher_user_id) do update set batch_id=excluded.batch_id,synced_at=now();
  return jsonb_build_object('ok',true,'count',v_count);
end;
$$;

-- The owner chooses BOTH the teacher scope and each individual read permission.
create or replace function public.app_supervisor_scope_get(p_supervisor_user_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
declare v_rows jsonb;
begin
  if not public.app_supervision_owner(auth.uid()) then raise exception 'OWNER_REQUIRED'; end if;
  if not exists(select 1 from public.app_users where user_id=p_supervisor_user_id and status='active' and role='teacher')
    then raise exception 'TEACHER_NOT_FOUND'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('teacher_id',t.user_id,'name',t.display_name,
    'students',coalesce(sc.view_students,false),'progress',coalesce(sc.view_progress,false),
    'ratings',coalesce(sc.view_ratings,false),'messages',coalesce(sc.view_messages,false),'backups',coalesce(sc.view_backups,false)) order by t.display_name),'[]'::jsonb)
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

-- Replace legacy read functions with scoped versions: the previous routes MUST NOT bypass the new restrictions.
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

create or replace function public.app_supervision_students(p_teacher_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_rows jsonb; v_sync timestamptz; v_progress boolean;
begin
  if not public.app_supervision_scope_check(v_actor,p_teacher_id,'students') then raise exception 'STUDENTS_SCOPE_REQUIRED'; end if;
  insert into public.app_supervision_audit(actor_user_id,action,target_teacher_id) values(v_actor,'students',p_teacher_id);
  v_progress:=public.app_supervision_scope_check(v_actor,p_teacher_id,'progress');
  select synced_at into v_sync from public.app_teacher_supervision_roster_state where teacher_user_id=p_teacher_id;
  with active_roster as (
    select r.* from public.app_teacher_supervision_roster r
    join public.app_teacher_supervision_roster_state st on st.teacher_user_id=r.teacher_user_id and st.batch_id=r.batch_id
    where r.teacher_user_id=p_teacher_id
  ), published as (
    select s.student_ref,s.snapshot,s.updated_at from public.guardian_portal_shares s
    where s.owner_user_id=p_teacher_id and s.revoked_at is null
  ), merged as (
    select coalesce(r.student_ref,p.student_ref) ref,
      coalesce(nullif(r.student_name,''),nullif(p.snapshot#>>'{student,name}',''),'طالب') name,
      coalesce(nullif(r.group_name,''),p.snapshot#>>'{student,group}','') group_name,
      coalesce(nullif(r.level_name,''),p.snapshot#>>'{student,level}','') level_name,
      coalesce(r.present_count,0) present_count,coalesce(r.absent_count,0) absent_count,
      p.snapshot, p.updated_at publish_at, r.updated_at roster_at,
      (r.student_ref is not null) in_roster,(p.student_ref is not null) is_published
    from active_roster r full outer join published p on p.student_ref=r.student_ref
  )
  select coalesce(jsonb_agg(jsonb_build_object('name',m.name,'group',m.group_name,'level',m.level_name,
    'present',case when v_progress and m.in_roster then m.present_count else null end,
    'absent',case when v_progress and m.in_roster then m.absent_count else null end,
    'published',m.is_published,'roster',m.in_roster,
    'mastery',case when v_progress then m.snapshot#>>'{metrics,mastery}' else null end,
    'attendance',case when v_progress then m.snapshot#>>'{metrics,attendance}' else null end,
    'repeats',case when v_progress then m.snapshot#>>'{metrics,repeats}' else null end,
    'new_ayat',case when v_progress then m.snapshot#>>'{metrics,newAyat}' else null end,
    'updated_at',coalesce(m.roster_at,m.publish_at)) order by m.name),'[]'::jsonb)
  into v_rows from (select * from merged order by name limit 500) m;
  return jsonb_build_object('students',v_rows,'roster_synced_at',v_sync,
    'source','كشف المحفظ المتزامن + آخر بيانات الطالب المنشورة؛ المؤشرات المنشورة ليست لحظية');
end;
$$;

create or replace function public.app_supervision_rating_details(p_teacher_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_rows jsonb;
begin
  if not public.app_supervision_scope_check(v_actor,p_teacher_id,'ratings') then raise exception 'RATINGS_SCOPE_REQUIRED'; end if;
  insert into public.app_supervision_audit(actor_user_id,action,target_teacher_id) values(v_actor,'rating_details',p_teacher_id);
  select coalesce(jsonb_agg(jsonb_build_object('scores',jsonb_build_object(
    'punctuality',r.punctuality,'teaching',r.teaching,'followup',r.followup,
    'kindness',r.kindness,'benefit',r.benefit,'clarity',r.clarity),
    'note',r.private_note,'updated_at',r.updated_at) order by r.updated_at desc),'[]'::jsonb)
    into v_rows from (select * from public.guardian_teacher_ratings where owner_user_id=p_teacher_id
      order by updated_at desc limit 100) r;
  return jsonb_build_object('ratings',v_rows);
end;
$$;

create or replace function public.app_supervision_audit_feed()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_rows jsonb;
begin
  if not public.app_supervision_owner(v_actor) then raise exception 'OWNER_REQUIRED'; end if;
  insert into public.app_supervision_audit(actor_user_id,action) values(v_actor,'audit');
  select coalesce(jsonb_agg(jsonb_build_object('action',x.action,'at',x.happened_at,
    'actor',coalesce(u.display_name,'مستخدم'),'teacher_id',x.target_teacher_id,
    'supervisor_id',x.supervisor_user_id,'permissions',x.permissions)
    order by x.happened_at desc),'[]'::jsonb)
    into v_rows from (
      select actor_user_id,action,target_teacher_id,null::uuid supervisor_user_id,null::jsonb permissions,happened_at
      from public.app_supervision_audit
      union all
      select actor_user_id,'scope_update'::text,teacher_user_id,supervisor_user_id,permissions,happened_at
      from public.app_supervisor_scope_audit
      order by happened_at desc limit 100
    ) x left join public.app_users u on u.user_id=x.actor_user_id;
  return jsonb_build_object('events',v_rows);
end;
$$;

revoke all on function public.app_supervision_owner(uuid) from public,anon,authenticated;
revoke all on function public.app_supervision_scope_check(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.app_teacher_roster_publish(jsonb,uuid) from public,anon,authenticated;
revoke all on function public.app_supervisor_scope_get(uuid) from public,anon,authenticated;
revoke all on function public.app_supervisor_scope_set(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.app_teacher_roster_publish(jsonb,uuid) to authenticated;
grant execute on function public.app_supervisor_scope_get(uuid) to authenticated;
grant execute on function public.app_supervisor_scope_set(uuid,uuid,jsonb) to authenticated;
-- Replaced existing RPC signatures keep their previous authenticated grants.



-- Private, unencrypted-at-application-layer JSON disaster-recovery snapshots.
create table if not exists public.app_teacher_backup_snapshots (
 id uuid primary key default gen_random_uuid(), teacher_user_id uuid not null references public.app_users(user_id),
 object_path text not null unique, created_at timestamptz not null default now(),
 size_bytes bigint not null check(size_bytes between 1 and 52428800),
 student_count integer not null default 0 check(student_count between 0 and 10000),
 session_count integer not null default 0 check(session_count between 0 and 200000),
 task_count integer not null default 0 check(task_count between 0 and 50000),
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'), app_version text not null default '',
 schema_version integer not null default 12, device_id text not null default ''
);
create index if not exists app_teacher_backup_snapshots_teacher_date_idx on public.app_teacher_backup_snapshots(teacher_user_id,created_at desc);
alter table public.app_teacher_backup_snapshots enable row level security;
revoke all on public.app_teacher_backup_snapshots from public,anon,authenticated;
create table if not exists public.app_teacher_backup_access_audit (
 id bigint generated always as identity primary key, actor_user_id uuid not null references auth.users(id),
 teacher_user_id uuid not null references public.app_users(user_id), snapshot_id uuid references public.app_teacher_backup_snapshots(id),
 action text not null check(action in ('register','list','download')), happened_at timestamptz not null default now()
);
create index if not exists app_teacher_backup_access_audit_date_idx on public.app_teacher_backup_access_audit(happened_at desc);
alter table public.app_teacher_backup_access_audit enable row level security;
revoke all on public.app_teacher_backup_access_audit from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academy-teacher-backups','academy-teacher-backups',false,52428800,array['application/json'])
on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['application/json'];
drop policy if exists wlq_academy_backup_insert_own on storage.objects;
create policy wlq_academy_backup_insert_own on storage.objects for insert to authenticated with check (
 bucket_id='academy-teacher-backups' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.app_users u where u.user_id=auth.uid() and u.status='active' and u.role in ('teacher','owner'))
);
drop policy if exists wlq_academy_backup_select_scoped on storage.objects;
create policy wlq_academy_backup_select_scoped on storage.objects for select to authenticated using (
 bucket_id='academy-teacher-backups' and exists(select 1 from public.app_users u where u.user_id=auth.uid() and u.status='active')
 and case when coalesce((storage.foldername(name))[1],'') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 then public.app_supervision_scope_check(auth.uid(),((storage.foldername(name))[1])::uuid,'backups') or (storage.foldername(name))[1]=auth.uid()::text else false end
);
create or replace function public.app_teacher_backup_register(p_object_path text,p_size_bytes bigint,p_student_count integer,p_session_count integer,p_task_count integer,p_sha256 text,p_app_version text default '',p_schema_version integer default 12,p_device_id text default '')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
 if v_actor is null or not exists(select 1 from public.app_users where user_id=v_actor and status='active' and role in ('teacher','owner')) then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
 if p_object_path is null or left(p_object_path,char_length(v_actor::text)+1)<>v_actor::text||'/' or position('..' in p_object_path)>0 or right(p_object_path,5)<>'.json' then raise exception 'INVALID_BACKUP_PATH'; end if;
 if p_size_bytes is null or p_size_bytes<1 or p_size_bytes>52428800 or p_student_count is null or p_student_count<0 or p_student_count>10000 or p_session_count is null or p_session_count<0 or p_session_count>200000 or p_task_count is null or p_task_count<0 or p_task_count>50000 or p_sha256 is null or p_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_BACKUP_METADATA'; end if;
 insert into public.app_teacher_backup_snapshots(teacher_user_id,object_path,size_bytes,student_count,session_count,task_count,sha256,app_version,schema_version,device_id)
 values(v_actor,p_object_path,p_size_bytes,p_student_count,p_session_count,p_task_count,p_sha256,left(coalesce(p_app_version,''),40),coalesce(p_schema_version,12),left(coalesce(p_device_id,''),120)) returning id into v_id;
 insert into public.app_teacher_backup_access_audit(actor_user_id,teacher_user_id,snapshot_id,action) values(v_actor,v_actor,v_id,'register');
 return jsonb_build_object('ok',true,'id',v_id);
end; $$;
create or replace function public.app_teacher_backup_list(p_teacher_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_rows jsonb;
begin
 if v_actor is null or p_teacher_user_id is null or (v_actor is distinct from p_teacher_user_id and not public.app_supervision_scope_check(v_actor,p_teacher_user_id,'backups')) then raise exception 'BACKUP_SCOPE_REQUIRED'; end if;
 if not exists(select 1 from public.app_users where user_id=p_teacher_user_id and status='active' and role in ('teacher','owner')) then raise exception 'TEACHER_NOT_FOUND'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'created_at',created_at,'size_bytes',size_bytes,'student_count',student_count,'session_count',session_count,'task_count',task_count,'sha256',sha256,'app_version',app_version,'schema_version',schema_version,'device_id',device_id) order by created_at desc),'[]'::jsonb)
 into v_rows from (select * from public.app_teacher_backup_snapshots where teacher_user_id=p_teacher_user_id order by created_at desc limit 90) s;
 insert into public.app_teacher_backup_access_audit(actor_user_id,teacher_user_id,action) values(v_actor,p_teacher_user_id,'list');
 return jsonb_build_object('snapshots',v_rows);
end; $$;
create or replace function public.app_teacher_backup_resolve(p_backup_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_teacher uuid; v_path text;
begin
 if v_actor is null or p_backup_id is null then raise exception 'AUTH_REQUIRED'; end if;
 select teacher_user_id,object_path into v_teacher,v_path from public.app_teacher_backup_snapshots where id=p_backup_id;
 if not found or (v_actor is distinct from v_teacher and not public.app_supervision_scope_check(v_actor,v_teacher,'backups')) then raise exception 'BACKUP_SCOPE_REQUIRED'; end if;
 insert into public.app_teacher_backup_access_audit(actor_user_id,teacher_user_id,snapshot_id,action) values(v_actor,v_teacher,p_backup_id,'download');
 return jsonb_build_object('ok',true,'object_path',v_path);
end; $$;
grant execute on function public.app_supervision_scope_check(uuid,uuid,text) to authenticated;
revoke all on function public.app_teacher_backup_register(text,bigint,integer,integer,integer,text,text,integer,text) from public,anon,authenticated;
revoke all on function public.app_teacher_backup_list(uuid) from public,anon,authenticated;
revoke all on function public.app_teacher_backup_resolve(uuid) from public,anon,authenticated;
grant execute on function public.app_teacher_backup_register(text,bigint,integer,integer,integer,text,text,integer,text) to authenticated;
grant execute on function public.app_teacher_backup_list(uuid) to authenticated;
grant execute on function public.app_teacher_backup_resolve(uuid) to authenticated;
