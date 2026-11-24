\set ON_ERROR_STOP on
begin;
do $$
declare v_rel regclass;
begin
  select 'public.student_recitation_submissions'::regclass into v_rel;
  if not (select relrowsecurity from pg_class where oid=v_rel) then raise exception 'RC16_HOME_SUBMISSIONS_RLS_DISABLED'; end if;
  if has_table_privilege('anon',v_rel,'select') or has_table_privilege('authenticated',v_rel,'select') then raise exception 'RC16_HOME_SUBMISSIONS_DIRECT_READ_GRANTED'; end if;
  select 'public.student_recitation_feedback'::regclass into v_rel;
  if not (select relrowsecurity from pg_class where oid=v_rel) then raise exception 'RC16_HOME_FEEDBACK_RLS_DISABLED'; end if;
  if has_table_privilege('anon',v_rel,'select') or has_table_privilege('authenticated',v_rel,'select') then raise exception 'RC16_HOME_FEEDBACK_DIRECT_READ_GRANTED'; end if;
  select 'public.student_recitation_ai_reviews'::regclass into v_rel;
  if not (select relrowsecurity from pg_class where oid=v_rel) then raise exception 'RC16_AI_RLS_DISABLED'; end if;
  if has_table_privilege('anon',v_rel,'select') or has_table_privilege('authenticated',v_rel,'select') then raise exception 'RC16_AI_DIRECT_READ_GRANTED'; end if;
  select 'public.student_achievement_events'::regclass into v_rel;
  if not (select relrowsecurity from pg_class where oid=v_rel) then raise exception 'RC16_LEDGER_RLS_DISABLED'; end if;
  if has_table_privilege('anon',v_rel,'select') or has_table_privilege('authenticated',v_rel,'select') then raise exception 'RC16_LEDGER_DIRECT_READ_GRANTED'; end if;
  select 'public.student_learning_competitions'::regclass into v_rel;
  if not (select relrowsecurity from pg_class where oid=v_rel) then raise exception 'RC16_COMPETITIONS_RLS_DISABLED'; end if;
  if has_table_privilege('anon',v_rel,'select') or has_table_privilege('authenticated',v_rel,'select') then raise exception 'RC16_COMPETITIONS_DIRECT_READ_GRANTED'; end if;
  if has_table_privilege('service_role','public.student_achievement_events','update') or has_table_privilege('service_role','public.student_achievement_events','delete') then raise exception 'RC16_LEDGER_MUTATION_GRANT_PRESENT'; end if;
  if has_table_privilege('service_role','public.student_learning_competitions','delete') then raise exception 'RC16_COMPETITION_DELETE_GRANT_PRESENT'; end if;
  if has_function_privilege('anon','public.rc16_valid_student_ref_array(text[])','execute') then raise exception 'RC16_VALIDATOR_EXPOSED_TO_ANON'; end if;
  if not exists(select 1 from storage.buckets where id='imam-home-recitations' and public=false) then raise exception 'RC16_AUDIO_BUCKET_NOT_PRIVATE'; end if;
end;
$$;

insert into auth.users
  (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('11111111-1111-4111-8111-111111111111','authenticated','authenticated',
   'rc16-db-contract@example.invalid','',now(),'{}'::jsonb,'{}'::jsonb,now(),now())
on conflict (id) do nothing;

set local role service_role;
insert into public.student_achievement_events
  (id,owner_user_id,student_ref,source,source_ref,event_type,category,points,approved_by,idempotency_key)
values
  ('22222222-2222-4222-8222-222222222222',
   '11111111-1111-4111-8111-111111111111',repeat('a',64),
   'teacher-approved-quiz','rc16-db-contract','quiz_completed','foundation',2,
   '11111111-1111-4111-8111-111111111111','rc16-db-contract-approval');
insert into public.student_learning_competitions
  (id,owner_user_id,title,scope,student_refs,participant_groups,group_names,request_key,opt_in,start_date,end_date,status,created_by)
values
  ('33333333-3333-4333-8333-333333333333',
   '11111111-1111-4111-8111-111111111111','RC16 DB contract test','individual',
   array[repeat('b',64)],jsonb_build_object(repeat('b',64),''),array[]::text[],
   'rc16-db-contract-competition',false,current_date,current_date,'active',
   '11111111-1111-4111-8111-111111111111');
reset role;

do $$
declare v_blocked boolean;
begin
  v_blocked := false;
  begin
    update public.student_achievement_events set note='must-not-update'
     where id='22222222-2222-4222-8222-222222222222';
  exception when others then v_blocked := true;
  end;
  if not v_blocked then raise exception 'RC16_LEDGER_UPDATE_WAS_NOT_BLOCKED'; end if;
  v_blocked := false;
  begin
    delete from public.student_achievement_events
     where id='22222222-2222-4222-8222-222222222222';
  exception when others then v_blocked := true;
  end;
  if not v_blocked then raise exception 'RC16_LEDGER_DELETE_WAS_NOT_BLOCKED'; end if;
end;
$$;

set local role service_role;
update public.student_learning_competitions
   set status='closed',closed_at=now(),closed_by='11111111-1111-4111-8111-111111111111'
 where id='33333333-3333-4333-8333-333333333333' and status='active';
reset role;

do $$
declare v_status text; v_blocked boolean;
begin
  select status into v_status from public.student_learning_competitions
   where id='33333333-3333-4333-8333-333333333333';
  if v_status <> 'closed' then raise exception 'RC16_COMPETITION_CLOSE_FAILED'; end if;
  v_blocked := false;
  begin
    update public.student_learning_competitions set title='tampered'
     where id='33333333-3333-4333-8333-333333333333';
  exception when others then v_blocked := true;
  end;
  if not v_blocked then raise exception 'RC16_COMPETITION_CORE_UPDATE_WAS_NOT_BLOCKED'; end if;
  v_blocked := false;
  begin
    delete from public.student_learning_competitions
     where id='33333333-3333-4333-8333-333333333333';
  exception when others then v_blocked := true;
  end;
  if not v_blocked then raise exception 'RC16_COMPETITION_DELETE_WAS_NOT_BLOCKED'; end if;
end;
$$;
rollback;
