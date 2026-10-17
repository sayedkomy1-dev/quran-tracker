-- Optional v11.11.0: authenticated, read-only scoped academic progress publication.
-- ADMINISTRATOR REVIEW REQUIRED: DO NOT execute automatically on production.
-- Requires previous scripts: teacher-ratings-supervision.sql and supervision-roster-permissions.sql.
-- Does not change tenant foundation; does not grant direct table privileges.
create table if not exists public.app_teacher_academic_progress (
  teacher_user_id uuid not null references public.app_users(user_id),
  session_ref text not null check(session_ref ~ '^[0-9a-f]{64}$'),
  student_ref text not null check(student_ref ~ '^[0-9a-f]{64}$'),
  session_day date not null,
  attendance text not null check(attendance in ('present','absent','excused','unknown')),
  grade text not null default '' check(grade in ('','ممتاز','جيد جداً','جيد','ضعيف','إعادة')),
  error_count integer not null default 0 check(error_count between 0 and 5000),
  source_updated_at timestamptz not null,
  synced_at timestamptz not null default now(),
  primary key(teacher_user_id,session_ref)
);
create index if not exists app_teacher_academic_progress_recent_idx
  on public.app_teacher_academic_progress(teacher_user_id,session_day desc);
alter table public.app_teacher_academic_progress enable row level security;
revoke all on table public.app_teacher_academic_progress from public,anon,authenticated;

create or replace function public.app_teacher_progress_publish(p_records jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_actor uuid:=auth.uid(); v_rec jsonb; v_count int:=0;
 v_ref text;v_session text;v_day date;v_att text;v_grade text;v_errors int;v_updated timestamptz;v_affected int;
begin
 if v_actor is null or not exists(select 1 from public.app_users where user_id=v_actor and status='active' and role in ('owner','teacher'))
 then raise exception 'ACTIVE_TEACHER_REQUIRED';end if;
 if p_records is null or jsonb_typeof(p_records)<>'array' or octet_length(p_records::text)>150000 or jsonb_array_length(p_records)>250
 then raise exception 'INVALID_BATCH';end if;
 -- Atomic validation; no partially accepted batch.
 for v_rec in select value from jsonb_array_elements(p_records) loop
   v_ref:=v_rec->>'student_ref';v_session:=v_rec->>'session_ref';v_att:=v_rec->>'attendance';v_grade:=coalesce(v_rec->>'grade','');
   if v_ref is null or v_ref !~ '^[0-9a-f]{64}$' or v_session is null or v_session !~ '^[0-9a-f]{64}$' or
      v_att not in ('present','absent','excused','unknown') or v_grade not in ('','ممتاز','جيد جداً','جيد','ضعيف','إعادة') or
      coalesce(v_rec->>'error_count','') !~ '^[0-9]{1,4}$' or
      coalesce(v_rec->>'day','') !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' or
      coalesce(v_rec->>'updated_at','') !~ '^20[0-9]{2}-' then raise exception 'INVALID_RECORD';end if;
   v_errors:=(v_rec->>'error_count')::integer;v_day:=(v_rec->>'day')::date;v_updated:=(v_rec->>'updated_at')::timestamptz;
   if v_day>current_date or v_day<current_date-730 or v_updated>now()+interval '1 day' then raise exception 'INVALID_RECORD_DATE';end if;
   if not exists(
    select 1 from public.app_teacher_supervision_roster r
    join public.app_teacher_supervision_roster_state state on state.teacher_user_id=r.teacher_user_id and state.batch_id=r.batch_id
    where r.teacher_user_id=v_actor and r.student_ref=v_ref
   ) then raise exception 'STUDENT_NOT_IN_CURRENT_ROSTER';end if;
 end loop;
 for v_rec in select value from jsonb_array_elements(p_records) loop
   insert into public.app_teacher_academic_progress(
     teacher_user_id,session_ref,student_ref,session_day,attendance,grade,error_count,source_updated_at
   ) values(v_actor,v_rec->>'session_ref',v_rec->>'student_ref',(v_rec->>'day')::date,
     v_rec->>'attendance',coalesce(v_rec->>'grade',''),(v_rec->>'error_count')::int,(v_rec->>'updated_at')::timestamptz)
   on conflict(teacher_user_id,session_ref) do update set
     student_ref=excluded.student_ref,session_day=excluded.session_day,attendance=excluded.attendance,
     grade=excluded.grade,error_count=excluded.error_count,source_updated_at=excluded.source_updated_at,synced_at=now()
   where app_teacher_academic_progress.source_updated_at<=excluded.source_updated_at;
   get diagnostics v_affected = row_count;
   v_count:=v_count+v_affected;
 end loop;
 return jsonb_build_object('ok',true,'count',v_count,'server_time',now());
end;$$;

create or replace function public.app_supervision_progress_recent(p_teacher_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid();v_rows jsonb;
begin
 if v_actor is null or p_teacher_id is null or not public.app_supervision_scope_check(v_actor,p_teacher_id,'progress')
 then raise exception 'PROGRESS_PERMISSION_REQUIRED';end if;
 insert into public.app_supervision_audit(actor_user_id,action,target_teacher_id) values(v_actor,'academic_progress',p_teacher_id);
 select coalesce(jsonb_agg(jsonb_build_object(
   'name',r.student_name,'group',r.group_name,'day',p.session_day,'attendance',p.attendance,
   'grade',p.grade,'errors',p.error_count,'synced_at',p.synced_at) order by p.session_day desc),'[]'::jsonb)
 into v_rows from (
   select * from public.app_teacher_academic_progress where teacher_user_id=p_teacher_id
     and session_day>=current_date-90 order by session_day desc,synced_at desc limit 150
 ) p inner join public.app_teacher_supervision_roster r
   on r.teacher_user_id=p.teacher_user_id and r.student_ref=p.student_ref
 inner join public.app_teacher_supervision_roster_state state
   on state.teacher_user_id=r.teacher_user_id and state.batch_id=r.batch_id;
 return jsonb_build_object('records',v_rows,'source','teacher-published','server_time',now());
end;$$;
revoke all on function public.app_teacher_progress_publish(jsonb) from public,anon,authenticated;
revoke all on function public.app_supervision_progress_recent(uuid) from public,anon,authenticated;
grant execute on function public.app_teacher_progress_publish(jsonb) to authenticated;
grant execute on function public.app_supervision_progress_recent(uuid) to authenticated;
