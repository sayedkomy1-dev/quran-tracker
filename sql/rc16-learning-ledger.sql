-- IMAM Beta28 RC16 — server-authoritative achievements and competitions.
-- Additive only. No student, guardian, session, or academic history is altered.
-- All reads/writes go through the authenticated rc16-learning-ledger Edge Function.

create or replace function public.rc16_valid_student_ref_array(p_refs text[])
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $rc16$
  select coalesce(
    cardinality(p_refs) between 1 and 200
    and cardinality(p_refs) = (select count(distinct r) from unnest(p_refs) as x(r))
    and not exists (select 1 from unnest(p_refs) as x(r) where r !~ '^[0-9a-f]{64}$'),
    false
  );
$rc16$;

create or replace function public.rc16_valid_participant_groups(p_refs text[],p_groups jsonb)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $rc16helper$
declare
  v_group_count integer;
begin
  if p_refs is null or p_groups is null or jsonb_typeof(p_groups) <> 'object' then
    return false;
  end if;
  select count(*) into v_group_count from jsonb_object_keys(p_groups);
  if v_group_count <> cardinality(p_refs) then
    return false;
  end if;
  if exists (select 1 from unnest(p_refs) as x(r) where not (p_groups ? r)) then
    return false;
  end if;
  if exists (
    select 1 from jsonb_each(p_groups) as x(k,v)
    where jsonb_typeof(v) <> 'string' or char_length(v #>> '{}') > 100
  ) then
    return false;
  end if;
  return true;
end;
$rc16helper$;

create table if not exists public.student_achievement_events (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  student_ref text not null,
  source text not null,
  source_ref text not null,
  event_type text not null,
  category text not null,
  points integer not null default 0,
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  occurred_at timestamptz not null default now(),
  idempotency_key text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint student_achievement_student_ref check (student_ref ~ '^[0-9a-f]{64}$'),
  constraint student_achievement_source check (source = 'teacher-approved-quiz'),
  constraint student_achievement_event_type check (event_type = 'quiz_completed'),
  constraint student_achievement_category check (category in ('foundation','tajweed','makharij','mutashabihat','surah','verse_completion','next_ayah','memorization')),
  constraint student_achievement_points check (points between 0 and 20),
  constraint student_achievement_source_ref check (char_length(source_ref) between 1 and 120),
  constraint student_achievement_idempotency check (char_length(idempotency_key) between 1 and 180),
  constraint student_achievement_note check (char_length(note) <= 300),
  constraint student_achievement_idempotent unique (owner_user_id,idempotency_key)
);

create index if not exists student_achievement_owner_student_time_idx
  on public.student_achievement_events(owner_user_id,student_ref,approved_at desc);
create index if not exists student_achievement_owner_time_idx
  on public.student_achievement_events(owner_user_id,approved_at desc);

alter table public.student_achievement_events enable row level security;
revoke all on table public.student_achievement_events from public, anon, authenticated, service_role;
grant select, insert on table public.student_achievement_events to service_role;

create or replace function public.rc16_reject_achievement_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'RC16_ACHIEVEMENT_LEDGER_APPEND_ONLY';
end;
$$;

drop trigger if exists student_achievement_events_append_only on public.student_achievement_events;
create trigger student_achievement_events_append_only
before update or delete on public.student_achievement_events
for each row execute function public.rc16_reject_achievement_mutation();

create table if not exists public.student_learning_competitions (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  scope text not null,
  student_refs text[] not null,
  participant_groups jsonb not null default '{}'::jsonb,
  group_names text[] not null default '{}',
  request_key text not null,
  opt_in boolean not null default false,
  start_date date not null,
  end_date date not null,
  status text not null default 'active',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  closed_by uuid references auth.users(id) on delete restrict,
  closed_at timestamptz,
  constraint student_competition_title check (char_length(title) between 1 and 100),
  constraint student_competition_scope check (scope in ('individual','circle','circle-to-circle')),
  constraint student_competition_refs check (public.rc16_valid_student_ref_array(student_refs)),
  constraint student_competition_participant_groups check (public.rc16_valid_participant_groups(student_refs,participant_groups)),
  constraint student_competition_request_key check (char_length(request_key) between 1 and 120),
  constraint student_competition_request_unique unique (owner_user_id,request_key),
  constraint student_competition_groups check (cardinality(group_names) between 0 and 50),
  constraint student_competition_dates check (start_date <= end_date),
  constraint student_competition_scope_members check (
    (scope='individual' and cardinality(student_refs)=1 and cardinality(group_names)=0 and opt_in=false)
    or (scope='circle' and cardinality(student_refs)>=1 and cardinality(group_names)=1 and opt_in=false)
    or (scope='circle-to-circle' and cardinality(student_refs)>=1 and cardinality(group_names)>=2 and opt_in=true)
  ),
  constraint student_competition_status check (
    (status='active' and closed_at is null and closed_by is null)
    or (status='closed' and closed_at is not null and closed_by is not null)
  )
);

create index if not exists student_competitions_owner_created_idx
  on public.student_learning_competitions(owner_user_id,created_at desc);
create index if not exists student_competitions_owner_status_idx
  on public.student_learning_competitions(owner_user_id,status,start_date,end_date);

alter table public.student_learning_competitions enable row level security;
revoke all on table public.student_learning_competitions from public, anon, authenticated, service_role;
grant select, insert, update on table public.student_learning_competitions to service_role;

create or replace function public.rc16_guard_competition_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'RC16_COMPETITION_DELETE_BLOCKED';
  end if;
  if row(new.id,new.owner_user_id,new.title,new.scope,new.student_refs,new.participant_groups,new.group_names,
         new.request_key,new.opt_in,new.start_date,new.end_date,new.created_by,new.created_at)
     is distinct from
     row(old.id,old.owner_user_id,old.title,old.scope,old.student_refs,old.participant_groups,old.group_names,
         old.request_key,old.opt_in,old.start_date,old.end_date,old.created_by,old.created_at) then
    raise exception 'RC16_COMPETITION_CORE_FIELDS_IMMUTABLE';
  end if;
  if old.status <> 'active' or new.status <> 'closed'
     or new.closed_at is null or new.closed_by is null then
    raise exception 'RC16_COMPETITION_CLOSE_ONLY';
  end if;
  return new;
end;
$$;

drop trigger if exists student_learning_competitions_close_only on public.student_learning_competitions;
create trigger student_learning_competitions_close_only
before update or delete on public.student_learning_competitions
for each row execute function public.rc16_guard_competition_mutation();

revoke all on function public.rc16_valid_student_ref_array(text[]) from public, anon, authenticated;
grant execute on function public.rc16_valid_student_ref_array(text[]) to service_role;
revoke all on function public.rc16_valid_participant_groups(text[],jsonb) from public, anon, authenticated;
grant execute on function public.rc16_valid_participant_groups(text[],jsonb) to service_role;
revoke all on function public.rc16_reject_achievement_mutation() from public, anon, authenticated;
grant execute on function public.rc16_reject_achievement_mutation() to service_role;
revoke all on function public.rc16_guard_competition_mutation() from public, anon, authenticated;
grant execute on function public.rc16_guard_competition_mutation() to service_role;

comment on table public.student_achievement_events is
  'RC16 authoritative append-only achievement ledger. Only authenticated teacher Edge Function writes; updates and deletes are blocked.';
comment on column public.student_achievement_events.student_ref is
  'SHA-256 of guardian-portal-v1|owner_user_id|local_student_id; no student name or direct identifier is stored.';
comment on column public.student_achievement_events.occurred_at is
  'Server approval timestamp used for competition windows; client clocks cannot backdate points.';
comment on table public.student_learning_competitions is
  'RC16 teacher-only competitions. Participant references and group assignments are snapshotted; request keys prevent duplicate creation; only active-to-closed transition is allowed.';
comment on column public.student_learning_competitions.participant_groups is
  'Immutable JSON object keyed by owner-scoped hashed student reference; stores the group assignment at competition creation, not the current roster group.';
