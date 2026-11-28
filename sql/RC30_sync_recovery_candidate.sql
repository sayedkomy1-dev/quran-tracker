-- RC30 candidate: additive recovery, private snapshots, scoped JSON export.
-- Execute in a staging database first. No deletion or reset of existing records.
begin;
alter table public.app_supervisor_teacher_scope add column if not exists view_backup boolean not null default false;
create table if not exists public.app_account_sync_history (
  owner_user_id uuid not null, revision bigint not null, payload text not null,
  saved_at timestamptz not null default now(), primary key(owner_user_id,revision)
);
alter table public.app_account_sync_history enable row level security;
revoke all on public.app_account_sync_history from public,anon,authenticated;
create or replace function public.app_account_sync_history_capture() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if tg_op='UPDATE' then insert into public.app_account_sync_history(owner_user_id,revision,payload,saved_at) values(old.owner_user_id,old.revision,old.payload,old.updated_at) on conflict do nothing; end if;
  insert into public.app_account_sync_history(owner_user_id,revision,payload,saved_at) values(new.owner_user_id,new.revision,new.payload,new.updated_at) on conflict do nothing;
  return new;
end; $$;
revoke all on function public.app_account_sync_history_capture() from public,anon,authenticated;
drop trigger if exists app_account_sync_history_capture on public.account_sync;
create trigger app_account_sync_history_capture after insert or update on public.account_sync for each row execute function public.app_account_sync_history_capture();
insert into public.app_account_sync_history(owner_user_id,revision,payload,saved_at) select owner_user_id,revision,payload,updated_at from public.account_sync on conflict do nothing;
create table if not exists public.app_teacher_recovery_backups (
  id bigint generated always as identity primary key, teacher_user_id uuid not null,
  revision bigint not null, backup_day date not null, saved_at timestamptz not null default now(), payload jsonb not null,
  unique(teacher_user_id,backup_day,revision)
);
create table if not exists public.app_teacher_backup_access_log (
  id bigint generated always as identity primary key, actor_user_id uuid not null, teacher_user_id uuid not null,
  backup_id bigint not null, accessed_at timestamptz not null default now()
);
alter table public.app_teacher_recovery_backups enable row level security;
alter table public.app_teacher_backup_access_log enable row level security;
revoke all on public.app_teacher_recovery_backups,public.app_teacher_backup_access_log from public,anon,authenticated;
create or replace function public.app_backup_scrub_v1(p jsonb) returns jsonb
language plpgsql immutable set search_path=public,pg_temp as $$
declare result jsonb;
begin
  if jsonb_typeof(p)='object' then
    select coalesce(jsonb_object_agg(k,public.app_backup_scrub_v1(v)),'{}'::jsonb) into result from jsonb_each(p) e(k,v)
    where regexp_replace(lower(k),'[^a-z0-9]','','g') !~ '(password|passphrase|secret|token|credential|pinhash|pinsalt|pinkdf|piniterations|apikey|privatekey|authkey|^pin$|guardianpin|^security$|^sync$|^accountowner$)';
    return result;
  elsif jsonb_typeof(p)='array' then select coalesce(jsonb_agg(public.app_backup_scrub_v1(v) order by n),'[]'::jsonb) into result from jsonb_array_elements(p) with ordinality e(v,n);return result;
  end if; return p;
end; $$;
revoke all on function public.app_backup_scrub_v1(jsonb) from public,anon,authenticated;
create or replace function public.app_teacher_backup_save_v1(p_payload jsonb,p_revision bigint,p_force boolean default false) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); rev bigint; d date:=(now() at time zone 'Africa/Cairo')::date; stamp timestamptz; clean jsonb;
begin
  if actor is null or not exists(select 1 from public.app_users where user_id=actor and status='active' and role in ('owner','teacher')) then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object' or p_payload->>'accountUserId' is distinct from actor::text or octet_length(p_payload::text)>20000000 then raise exception 'INVALID_BACKUP'; end if;
  if jsonb_typeof(p_payload->'students') is distinct from 'array' or jsonb_typeof(p_payload->'sessions') is distinct from 'array' or jsonb_typeof(p_payload->'tasks') is distinct from 'array' or jsonb_typeof(p_payload->'settings') is distinct from 'object' then raise exception 'INVALID_BACKUP_COLLECTIONS'; end if;
  if jsonb_array_length(p_payload->'students')+jsonb_array_length(p_payload->'sessions')+jsonb_array_length(p_payload->'tasks')=0 then raise exception 'EMPTY_BACKUP_BLOCKED'; end if;
  select revision into rev from public.account_sync where owner_user_id=actor for update;
  if not found or p_revision is distinct from rev then raise exception 'BACKUP_REVISION_CONFLICT'; end if;
  select saved_at into stamp from public.app_teacher_recovery_backups where teacher_user_id=actor and backup_day=d and (not coalesce(p_force,false) or revision=rev) order by saved_at desc limit 1;
  if found then return jsonb_build_object('ok',true,'saved_at',stamp,'existing',true); end if;
  clean:=public.app_backup_scrub_v1(jsonb_build_object('meta',p_payload->'meta','accountUserId',actor,'students',p_payload->'students','sessions',p_payload->'sessions','tasks',p_payload->'tasks','settings',p_payload->'settings'));
  insert into public.app_teacher_recovery_backups(teacher_user_id,revision,backup_day,payload) values(actor,rev,d,clean) returning saved_at into stamp;
  return jsonb_build_object('ok',true,'saved_at',stamp);
end; $$;
create or replace function public.app_teacher_backup_allowed_v1(p_actor uuid,p_teacher uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select public.app_supervision_owner(p_actor) or (public.app_supervision_scope_check(p_actor,p_teacher,'progress') and exists(select 1 from public.app_supervisor_teacher_scope s where s.supervisor_user_id=p_actor and s.teacher_user_id=p_teacher and s.view_backup));
$$;
create or replace function public.app_teacher_backup_list_v1(p_teacher_id uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  if auth.uid() is null or not coalesce(public.app_teacher_backup_allowed_v1(auth.uid(),p_teacher_id),false) then raise exception 'BACKUP_ACCESS_DENIED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id::text,'saved_at',b.saved_at,'revision',b.revision,'students',jsonb_array_length(b.payload->'students'),'sessions',jsonb_array_length(b.payload->'sessions')) order by b.saved_at desc),'[]'::jsonb) into result from (select * from public.app_teacher_recovery_backups where teacher_user_id=p_teacher_id order by saved_at desc limit 90) b;
  return jsonb_build_object('backups',result);
end; $$;
create or replace function public.app_teacher_backup_download_v1(p_teacher_id uuid,p_backup_id bigint) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
  if auth.uid() is null or not coalesce(public.app_teacher_backup_allowed_v1(auth.uid(),p_teacher_id),false) then raise exception 'BACKUP_ACCESS_DENIED'; end if;
  select payload into result from public.app_teacher_recovery_backups where teacher_user_id=p_teacher_id and id=p_backup_id;
  if not found then raise exception 'BACKUP_NOT_FOUND'; end if;
  insert into public.app_teacher_backup_access_log(actor_user_id,teacher_user_id,backup_id) values(auth.uid(),p_teacher_id,p_backup_id);
  return jsonb_build_object('payload',result);
end; $$;
create or replace function public.app_teacher_roster_publish_safe_v1(p_students jsonb,p_batch uuid,p_deleted_refs text[])
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_row jsonb; v_count integer; v_ref text; v_name text;
begin
  if v_actor is null or not exists(select 1 from public.app_users where user_id=v_actor and status='active' and role in ('owner','teacher'))
    then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  if p_batch is null or p_students is null or jsonb_typeof(p_students)<>'array' or octet_length(p_students::text)>180000
    then raise exception 'INVALID_ROSTER'; end if;
  v_count:=jsonb_array_length(p_students);
  if array_position(p_deleted_refs,null) is not null then raise exception 'INVALID_DELETION_REFS'; end if;
  if v_count=0 then raise exception 'EMPTY_ROSTER_BLOCKED'; end if;
  -- Serialize per teacher and compare against the last committed roster BEFORE any upsert.
  perform pg_advisory_xact_lock(hashtextextended('imam-roster:'||v_actor::text,0));
  if (select count(distinct value->>'ref') from jsonb_array_elements(p_students))<>v_count then raise exception 'DUPLICATE_ROSTER'; end if;
  if exists(select 1 from public.app_teacher_supervision_roster r join public.app_teacher_supervision_roster_state st
      on st.teacher_user_id=r.teacher_user_id and st.batch_id=r.batch_id where r.teacher_user_id=v_actor
      and not exists(select 1 from jsonb_array_elements(p_students) e where e->>'ref'=r.student_ref)
      and not (r.student_ref=any(coalesce(p_deleted_refs,array[]::text[])))) then raise exception 'PARTIAL_ROSTER_BLOCKED'; end if;
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
create or replace function public.app_teacher_roster_publish(p_students jsonb,p_batch uuid) returns jsonb
language sql security definer set search_path=public,pg_temp as $$ select public.app_teacher_roster_publish_safe_v1(p_students,p_batch,array[]::text[]); $$;
create or replace function public.app_supervisor_scope_get(p_supervisor_user_id uuid)
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
declare v_rows jsonb;
begin
  if not public.app_supervision_owner(auth.uid()) then raise exception 'OWNER_REQUIRED'; end if;
  if not exists(select 1 from public.app_users where user_id=p_supervisor_user_id and status='active' and role='teacher')
    then raise exception 'TEACHER_NOT_FOUND'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('teacher_id',t.user_id,'name',t.display_name,
    'backup',coalesce(sc.view_backup,false),'students',coalesce(sc.view_students,false),'progress',coalesce(sc.view_progress,false),
    'ratings',coalesce(sc.view_ratings,false),'messages',coalesce(sc.view_messages,false)) order by t.display_name),'[]'::jsonb)
  into v_rows from public.app_users t
  left join public.app_supervisor_teacher_scope sc on sc.teacher_user_id=t.user_id and sc.supervisor_user_id=p_supervisor_user_id
  where t.role='teacher' and t.status='active' and t.user_id<>p_supervisor_user_id;
  return jsonb_build_object('teachers',v_rows);
end;
$$;
create or replace function public.app_supervisor_scope_set(p_supervisor_user_id uuid,p_teacher_user_id uuid,p_permissions jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_students boolean; v_progress boolean; v_ratings boolean; v_messages boolean; v_backup boolean;
begin
  if not public.app_supervision_owner(v_actor) then raise exception 'OWNER_REQUIRED'; end if;
  if p_supervisor_user_id=p_teacher_user_id or not exists(
    select 1 from public.app_users u join public.app_supervisor_grants g on g.supervisor_user_id=u.user_id and g.revoked_at is null
    where u.user_id=p_supervisor_user_id and u.status='active' and u.role='teacher')
    or not exists(select 1 from public.app_users where user_id=p_teacher_user_id and status='active' and role='teacher')
    then raise exception 'ACTIVE_SUPERVISOR_AND_TEACHER_REQUIRED'; end if;
  if p_permissions is null or jsonb_typeof(p_permissions)<>'object' then raise exception 'INVALID_SCOPE'; end if;
  if exists(select 1 from jsonb_object_keys(p_permissions) as k
    where k not in ('students','progress','ratings','messages','backup')) then raise exception 'INVALID_SCOPE'; end if;
  if exists(select 1 from jsonb_each(p_permissions) e where jsonb_typeof(e.value)<>'boolean') then raise exception 'INVALID_SCOPE'; end if;
  v_students:=coalesce((p_permissions->>'students')::boolean,false);
  v_progress:=coalesce((p_permissions->>'progress')::boolean,false);
  v_ratings:=coalesce((p_permissions->>'ratings')::boolean,false);
  v_messages:=coalesce((p_permissions->>'messages')::boolean,false);
  v_backup:=coalesce((p_permissions->>'backup')::boolean,(select view_backup from public.app_supervisor_teacher_scope where supervisor_user_id=p_supervisor_user_id and teacher_user_id=p_teacher_user_id),false);
  if v_backup and not (v_students and v_progress) then v_backup:=false; end if;
  if v_progress and not v_students then raise exception 'STUDENT_PERMISSION_REQUIRED'; end if;
  insert into public.app_supervisor_teacher_scope(supervisor_user_id,teacher_user_id,view_students,view_progress,view_ratings,view_messages,view_backup,updated_by)
  values(p_supervisor_user_id,p_teacher_user_id,v_students,v_progress,v_ratings,v_messages,v_backup,v_actor)
  on conflict(supervisor_user_id,teacher_user_id) do update set
    view_students=excluded.view_students,view_progress=excluded.view_progress,view_ratings=excluded.view_ratings,
    view_messages=excluded.view_messages,view_backup=excluded.view_backup,updated_by=v_actor,updated_at=now();
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
    'can_backup',v_owner or (coalesce(sc.view_students,false) and coalesce(sc.view_progress,false) and coalesce(sc.view_backup,false)),
    'can_students',v_owner or coalesce(sc.view_students,false),
    'can_progress',v_owner or (coalesce(sc.view_students,false) and coalesce(sc.view_progress,false)),
    'can_ratings',v_owner or coalesce(sc.view_ratings,false),
    'can_messages',v_owner or coalesce(sc.view_messages,false),
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
    and (v_owner or (t.role='teacher' and (coalesce(sc.view_students,false) or coalesce(sc.view_ratings,false) or coalesce(sc.view_messages,false))));
  return jsonb_build_object('teachers',v_rows,'owner',v_owner);
end;
$$;
revoke all on function public.app_teacher_backup_save_v1(jsonb,bigint,boolean) from public,anon,authenticated;
grant execute on function public.app_teacher_backup_save_v1(jsonb,bigint,boolean) to authenticated;
revoke all on function public.app_teacher_backup_list_v1(uuid) from public,anon,authenticated;
grant execute on function public.app_teacher_backup_list_v1(uuid) to authenticated;
revoke all on function public.app_teacher_backup_download_v1(uuid,bigint) from public,anon,authenticated;
grant execute on function public.app_teacher_backup_download_v1(uuid,bigint) to authenticated;
revoke all on function public.app_teacher_roster_publish_safe_v1(jsonb,uuid,text[]) from public,anon,authenticated;
-- Internal helper: callable only through the SECURITY DEFINER public wrapper.
revoke all on function public.app_teacher_roster_publish_safe_v1(jsonb,uuid,text[]) from public,anon,authenticated;
revoke all on function public.app_teacher_roster_publish(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.app_teacher_roster_publish(jsonb,uuid) to authenticated;
revoke all on function public.app_supervisor_scope_get(uuid) from public,anon,authenticated;
grant execute on function public.app_supervisor_scope_get(uuid) to authenticated;
revoke all on function public.app_supervisor_scope_set(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.app_supervisor_scope_set(uuid,uuid,jsonb) to authenticated;
revoke all on function public.app_supervision_dashboard() from public,anon,authenticated;
grant execute on function public.app_supervision_dashboard() to authenticated;
revoke all on function public.app_teacher_backup_allowed_v1(uuid,uuid) from public,anon,authenticated;
commit;
