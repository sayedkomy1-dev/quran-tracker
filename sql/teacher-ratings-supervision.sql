-- v11.7 Stage 1 — private teacher ratings + supervisor read-only permissions.
-- ADD-ONLY: existing app_users role/check, students, sessions, finance and previous RPCs untouched.
-- "supervisor" is an independently granted functional role to preserve the app_users constraint.

create table if not exists public.app_supervisor_grants (
  supervisor_user_id uuid primary key references public.app_users(user_id) on delete cascade,
  granted_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table public.app_supervisor_grants enable row level security;
revoke all on public.app_supervisor_grants from public, anon, authenticated;

create table if not exists public.guardian_teacher_ratings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  guardian_account_id uuid not null references public.guardian_portal_accounts(id) on delete cascade,
  student_ref text not null check (student_ref ~ '^[0-9a-f]{64}$'),
  punctuality smallint not null check (punctuality between 1 and 5),
  teaching smallint not null check (teaching between 1 and 5),
  followup smallint not null check (followup between 1 and 5),
  kindness smallint not null check (kindness between 1 and 5),
  benefit smallint not null check (benefit between 1 and 5),
  clarity smallint not null check (clarity between 1 and 5),
  private_note text not null default '' check (char_length(private_note)<=800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id,guardian_account_id,student_ref)
);
create index if not exists teacher_ratings_owner_idx on public.guardian_teacher_ratings(owner_user_id,updated_at desc);
alter table public.guardian_teacher_ratings enable row level security;
revoke all on public.guardian_teacher_ratings from public, anon, authenticated;

create table if not exists public.app_supervision_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users(id),
  action text not null check (action in ('dashboard','students','rating_details','grant','revoke','audit')),
  target_teacher_id uuid references auth.users(id),
  happened_at timestamptz not null default now()
);
create index if not exists supervision_audit_recent_idx on public.app_supervision_audit(happened_at desc);
alter table public.app_supervision_audit enable row level security;
revoke all on public.app_supervision_audit from public, anon, authenticated;

-- Internal authorization used only by SECURITY DEFINER functions, never granted to browsers.
create or replace function public.app_supervisor_authorized(p_actor uuid)
returns boolean language sql security definer stable set search_path=public,pg_temp as $$
 select exists(select 1 from public.app_users u where u.user_id=p_actor and u.status='active'
    and (u.role='owner' or exists(select 1 from public.app_supervisor_grants g
      where g.supervisor_user_id=u.user_id and g.revoked_at is null)));
$$;
revoke all on function public.app_supervisor_authorized(uuid) from public, anon, authenticated;

-- PIN session + linked student is mandatory. Public snapshot and share tokens cannot be used.
create or replace function public.guardian_teacher_rating_submit(
  p_session uuid,p_student_ref text,p_scores jsonb,p_note text default ''
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_owner uuid; v_account uuid; v_values integer[]; v_note text:=btrim(coalesce(p_note,''));
begin
  if p_session is null or p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_scores) <> 'object' then raise exception 'INVALID_REQUEST'; end if;
  v_values:=array[
    (p_scores->>'punctuality')::integer,(p_scores->>'teaching')::integer,
    (p_scores->>'followup')::integer,(p_scores->>'kindness')::integer,
    (p_scores->>'benefit')::integer,(p_scores->>'clarity')::integer
  ];
  if array_position(v_values,null) is not null or exists(select 1 from unnest(v_values) n where n<1 or n>5)
    or char_length(v_note)>800 then raise exception 'INVALID_RATING'; end if;
  select sh.owner_user_id,sh.guardian_account_id into v_owner,v_account
  from public.guardian_portal_sessions sess
  join public.guardian_portal_shares sh on sh.guardian_account_id=any(sess.account_ids)
  join public.guardian_portal_accounts ac on ac.id=sh.guardian_account_id and ac.disabled_at is null
  join public.app_users teacher on teacher.user_id=sh.owner_user_id and teacher.status='active'
  where sess.session_token=p_session and sess.revoked_at is null and sess.expires_at>now()
    and sh.student_ref=p_student_ref and sh.guardian_account_id is not null limit 1;
  if v_owner is null then raise exception 'GUARDIAN_SESSION_REQUIRED'; end if;
  insert into public.guardian_teacher_ratings(owner_user_id,guardian_account_id,student_ref,
    punctuality,teaching,followup,kindness,benefit,clarity,private_note)
  values(v_owner,v_account,p_student_ref,v_values[1],v_values[2],v_values[3],v_values[4],v_values[5],v_values[6],v_note)
  on conflict(owner_user_id,guardian_account_id,student_ref) do update set
    punctuality=excluded.punctuality,teaching=excluded.teaching,followup=excluded.followup,
    kindness=excluded.kindness,benefit=excluded.benefit,clarity=excluded.clarity,
    private_note=excluded.private_note,updated_at=now();
  return jsonb_build_object('ok',true);
exception when invalid_text_representation then raise exception 'INVALID_RATING';
end;
$$;

create or replace function public.guardian_teacher_rating_session_get(p_session uuid,p_student_ref text)
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
declare v_owner uuid; v_account uuid; v_rating jsonb;
begin
  if p_session is null or p_student_ref is null or p_student_ref !~ '^[0-9a-f]{64}$'
    then raise exception 'INVALID_REQUEST'; end if;
  select sh.owner_user_id,sh.guardian_account_id into v_owner,v_account
  from public.guardian_portal_sessions sess
  join public.guardian_portal_shares sh on sh.guardian_account_id=any(sess.account_ids)
  join public.guardian_portal_accounts ac on ac.id=sh.guardian_account_id and ac.disabled_at is null
  join public.app_users teacher on teacher.user_id=sh.owner_user_id and teacher.status='active'
  where sess.session_token=p_session and sess.revoked_at is null and sess.expires_at>now()
    and sh.student_ref=p_student_ref and sh.guardian_account_id is not null limit 1;
  if v_owner is null then raise exception 'GUARDIAN_SESSION_REQUIRED'; end if;
  select jsonb_build_object('scores',jsonb_build_object(
    'punctuality',punctuality,'teaching',teaching,'followup',followup,
    'kindness',kindness,'benefit',benefit,'clarity',clarity),'note',private_note,'updated_at',updated_at)
    into v_rating from public.guardian_teacher_ratings
    where owner_user_id=v_owner and guardian_account_id=v_account and student_ref=p_student_ref;
  return jsonb_build_object('rating',v_rating);
end;
$$;

-- Owner can grant/revoke supervision only to existing approved teachers.
create or replace function public.app_supervisor_assign(p_user_id uuid,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null or not exists(select 1 from public.app_users
      where user_id=v_actor and role='owner' and status='active') then raise exception 'OWNER_REQUIRED'; end if;
  if p_user_id=v_actor or not exists(select 1 from public.app_users
      where user_id=p_user_id and role='teacher' and status='active') then raise exception 'ACTIVE_TEACHER_REQUIRED'; end if;
  insert into public.app_supervisor_grants(supervisor_user_id,granted_by,revoked_at)
  values(p_user_id,v_actor,case when p_enabled then null else now() end)
  on conflict(supervisor_user_id) do update set granted_by=v_actor,granted_at=now(),
    revoked_at=case when p_enabled then null else now() end;
  insert into public.app_supervision_audit(actor_user_id,action,target_teacher_id)
  values(v_actor,case when p_enabled then 'grant' else 'revoke' end,p_user_id);
  return jsonb_build_object('ok',true);
end;
$$;

create or replace function public.app_supervision_access()
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_owner boolean;
begin
  if not public.app_supervisor_authorized(v_actor) then return jsonb_build_object('allowed',false); end if;
  select role='owner' into v_owner from public.app_users where user_id=v_actor;
  return jsonb_build_object('allowed',true,'owner',coalesce(v_owner,false));
end;
$$;

create or replace function public.app_supervision_dashboard()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_rows jsonb;
begin
  if not public.app_supervisor_authorized(v_actor) then raise exception 'SUPERVISOR_REQUIRED'; end if;
  insert into public.app_supervision_audit(actor_user_id,action) values(v_actor,'dashboard');
  select coalesce(jsonb_agg(jsonb_build_object('id',t.user_id,'name',t.display_name,'role',t.role,
    'published_students',(select count(distinct s.student_ref) from public.guardian_portal_shares s where s.owner_user_id=t.user_id),
    'messages',(select count(*) from public.guardian_teacher_messages m where m.owner_user_id=t.user_id),
    'rated_guardians',(select count(*) from public.guardian_teacher_ratings r where r.owner_user_id=t.user_id),
    'rating_average',(select round(avg((r.punctuality+r.teaching+r.followup+r.kindness+r.benefit+r.clarity)::numeric/6),2)
       from public.guardian_teacher_ratings r where r.owner_user_id=t.user_id),
    'supervisor',exists(select 1 from public.app_supervisor_grants gr
        where gr.supervisor_user_id=t.user_id and gr.revoked_at is null)) order by t.display_name),'[]'::jsonb)
    into v_rows from public.app_users t where t.status='active' and t.role in ('teacher','owner');
  return jsonb_build_object('teachers',v_rows);
end;
$$;

create or replace function public.app_supervision_students(p_teacher_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_rows jsonb;
begin
  if not public.app_supervisor_authorized(v_actor) then raise exception 'SUPERVISOR_REQUIRED'; end if;
  if not exists(select 1 from public.app_users where user_id=p_teacher_id and status='active')
    then raise exception 'TEACHER_NOT_FOUND'; end if;
  insert into public.app_supervision_audit(actor_user_id,action,target_teacher_id) values(v_actor,'students',p_teacher_id);
  select coalesce(jsonb_agg(jsonb_build_object('name',x.snapshot#>>'{student,name}',
    'mastery',x.snapshot#>>'{metrics,mastery}','attendance',x.snapshot#>>'{metrics,attendance}',
    'repeats',x.snapshot#>>'{metrics,repeats}','new_ayat',x.snapshot#>>'{metrics,newAyat}') order by x.updated_at desc),'[]'::jsonb)
    into v_rows from (select distinct on (student_ref) snapshot,updated_at
      from public.guardian_portal_shares where owner_user_id=p_teacher_id
      order by student_ref,updated_at desc limit 120) x;
  return jsonb_build_object('students',v_rows,'source','آخر بيانات منشورة من بوابة ولي الأمر فقط');
end;
$$;

create or replace function public.app_supervision_rating_details(p_teacher_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_rows jsonb;
begin
  if not public.app_supervisor_authorized(v_actor) then raise exception 'SUPERVISOR_REQUIRED'; end if;
  insert into public.app_supervision_audit(actor_user_id,action,target_teacher_id)
  values(v_actor,'rating_details',p_teacher_id);
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
  if not public.app_supervisor_authorized(v_actor) then raise exception 'SUPERVISOR_REQUIRED'; end if;
  insert into public.app_supervision_audit(actor_user_id,action) values(v_actor,'audit');
  select coalesce(jsonb_agg(jsonb_build_object('action',x.action,'at',x.happened_at,
    'actor',coalesce(u.display_name,'مستخدم'),'teacher_id',x.target_teacher_id)
    order by x.happened_at desc),'[]'::jsonb)
    into v_rows from (select * from public.app_supervision_audit order by happened_at desc limit 100) x
    left join public.app_users u on u.user_id=x.actor_user_id;
  return jsonb_build_object('events',v_rows);
end;
$$;

revoke all on function public.guardian_teacher_rating_submit(uuid,text,jsonb,text) from public;
revoke all on function public.guardian_teacher_rating_session_get(uuid,text) from public;
revoke all on function public.app_supervisor_assign(uuid,boolean) from public;
revoke all on function public.app_supervision_access() from public;
revoke all on function public.app_supervision_dashboard() from public;
revoke all on function public.app_supervision_students(uuid) from public;
revoke all on function public.app_supervision_rating_details(uuid) from public;
revoke all on function public.app_supervision_audit_feed() from public;
grant execute on function public.guardian_teacher_rating_submit(uuid,text,jsonb,text) to anon,authenticated;
grant execute on function public.guardian_teacher_rating_session_get(uuid,text) to anon,authenticated;
grant execute on function public.app_supervisor_assign(uuid,boolean) to authenticated;
grant execute on function public.app_supervision_access() to authenticated;
grant execute on function public.app_supervision_dashboard() to authenticated;
grant execute on function public.app_supervision_students(uuid) to authenticated;
grant execute on function public.app_supervision_rating_details(uuid) to authenticated;
grant execute on function public.app_supervision_audit_feed() to authenticated;
