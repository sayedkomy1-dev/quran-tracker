-- We Live Quran v10.10.0 — Guardian Portal Stage 3.3
-- Forgot-PIN request workflow: guardian requests a reset by phone; the teacher resolves it.
-- Additive only. Local application Schema remains 12 and student/session data is untouched.
-- Requires Stage 3 (sql/guardian-portal-login.sql).

create table if not exists public.guardian_portal_reset_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.guardian_portal_accounts(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now(),
  request_count integer not null default 1,
  resolved_at timestamptz,
  constraint guardian_reset_request_status check (status in ('pending','resolved','dismissed')),
  constraint guardian_reset_request_count_positive check (request_count > 0)
);

alter table public.guardian_portal_reset_requests enable row level security;
revoke all on table public.guardian_portal_reset_requests from public, anon, authenticated;

create unique index if not exists guardian_portal_reset_one_pending_per_account
  on public.guardian_portal_reset_requests(account_id)
  where status='pending';

create index if not exists guardian_portal_reset_owner_pending_idx
  on public.guardian_portal_reset_requests(owner_user_id, last_requested_at desc)
  where status='pending';

create table if not exists public.guardian_portal_reset_guard (
  phone_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now(),
  constraint guardian_reset_guard_hash_format check (phone_hash ~ '^[0-9a-f]{64}$'),
  constraint guardian_reset_guard_count_nonnegative check (request_count >= 0)
);

alter table public.guardian_portal_reset_guard enable row level security;
revoke all on table public.guardian_portal_reset_guard from public, anon, authenticated;

-- Public. Always returns the same success envelope so a caller cannot discover
-- whether a phone number exists in the academy. Up to 3 accepted requests per
-- phone hash per 24-hour window; extra requests are silently ignored.
create or replace function public.guardian_portal_request_pin_reset(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_phone_hash text;
  v_guard public.guardian_portal_reset_guard%rowtype;
  v_guard_exists boolean := false;
  v_accounts uuid[];
  v_account_id uuid;
  v_owner_id uuid;
  v_count integer := 0;
begin
  begin
    v_phone_hash := public.guardian_portal_phone_hash(p_phone);
  exception when others then
    perform pg_sleep(0.30);
    return jsonb_build_object('ok',true,'status','REQUEST_RECORDED');
  end;

  select array_agg(a.id order by a.id)
  into v_accounts
  from public.guardian_portal_accounts a
  where a.phone_hash=v_phone_hash
    and a.disabled_at is null
    and exists(
      select 1 from public.app_users u
      where u.user_id=a.owner_user_id and u.status='active'
    )
    and exists(
      select 1 from public.guardian_portal_shares s
      where s.guardian_account_id=a.id
    );

  if v_accounts is null or cardinality(v_accounts)=0 then
    perform pg_sleep(0.30);
    return jsonb_build_object('ok',true,'status','REQUEST_RECORDED');
  end if;

  select * into v_guard
  from public.guardian_portal_reset_guard
  where phone_hash=v_phone_hash
  for update;
  v_guard_exists := found;

  if v_guard_exists and v_guard.blocked_until is not null and v_guard.blocked_until>now() then
    perform pg_sleep(0.30);
    return jsonb_build_object('ok',true,'status','REQUEST_RECORDED');
  end if;

  if (not v_guard_exists) or v_guard.window_started_at < now()-interval '24 hours' then
    insert into public.guardian_portal_reset_guard(phone_hash,window_started_at,request_count,blocked_until,updated_at)
    values(v_phone_hash,now(),1,null,now())
    on conflict(phone_hash) do update
      set window_started_at=now(),request_count=1,blocked_until=null,updated_at=now();
    v_count := 1;
  else
    v_count := coalesce(v_guard.request_count,0)+1;
    update public.guardian_portal_reset_guard
    set request_count=v_count,
        blocked_until=case when v_count>=3 then v_guard.window_started_at+interval '24 hours' else null end,
        updated_at=now()
    where phone_hash=v_phone_hash;
  end if;

  -- The third accepted request is recorded; requests after it are ignored until
  -- the 24-hour window resets.
  if v_count>3 then
    perform pg_sleep(0.30);
    return jsonb_build_object('ok',true,'status','REQUEST_RECORDED');
  end if;

  foreach v_account_id in array v_accounts loop
    select a.owner_user_id into v_owner_id
    from public.guardian_portal_accounts a
    where a.id=v_account_id;

    insert into public.guardian_portal_reset_requests(account_id,owner_user_id,status,requested_at,last_requested_at,request_count)
    values(v_account_id,v_owner_id,'pending',now(),now(),1)
    on conflict(account_id) where status='pending'
    do update set last_requested_at=now(),request_count=public.guardian_portal_reset_requests.request_count+1;
  end loop;

  perform pg_sleep(0.30);
  return jsonb_build_object('ok',true,'status','REQUEST_RECORDED');
end;
$$;

-- Teacher-only. Returns pending requests for the signed-in teacher with only
-- last 4 phone digits and the already-published student names/refs.
create or replace function public.guardian_portal_reset_requests_list()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;

  select jsonb_build_object(
    'requests',coalesce(jsonb_agg(
      jsonb_build_object(
        'id',r.id,
        'phone_last4',a.phone_last4,
        'requested_at',r.last_requested_at,
        'request_count',r.request_count,
        'students',coalesce((
          select jsonb_agg(jsonb_build_object(
            'student_ref',s.student_ref,
            'name',coalesce(s.snapshot#>>'{student,name}','طالب')
          ) order by coalesce(s.snapshot#>>'{student,name}','طالب'))
          from public.guardian_portal_shares s
          where s.guardian_account_id=a.id
        ),'[]'::jsonb)
      ) order by r.last_requested_at desc
    ),'[]'::jsonb)
  ) into v_result
  from public.guardian_portal_reset_requests r
  join public.guardian_portal_accounts a on a.id=r.account_id
  where r.owner_user_id=v_uid and r.status='pending' and a.disabled_at is null;

  return coalesce(v_result,jsonb_build_object('requests','[]'::jsonb));
end;
$$;

-- Teacher-only. Generates a new PIN supplied by the teacher app, invalidates
-- current guardian sessions, and resolves every pending request for that account.
create or replace function public.guardian_portal_reset_request_resolve(
  p_request uuid,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_account_id uuid;
  v_last4 text;
  v_students jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then raise exception 'INVALID_PIN'; end if;

  select r.account_id,a.phone_last4
  into v_account_id,v_last4
  from public.guardian_portal_reset_requests r
  join public.guardian_portal_accounts a on a.id=r.account_id
  where r.id=p_request and r.owner_user_id=v_uid and r.status='pending'
  for update of r;

  if v_account_id is null then raise exception 'RESET_REQUEST_NOT_FOUND'; end if;

  update public.guardian_portal_accounts
  set pin_hash=crypt(p_pin,gen_salt('bf',10)),disabled_at=null,updated_at=now()
  where id=v_account_id and owner_user_id=v_uid;

  update public.guardian_portal_sessions
  set revoked_at=coalesce(revoked_at,now())
  where v_account_id=any(account_ids) and revoked_at is null;

  update public.guardian_portal_reset_requests
  set status='resolved',resolved_at=now()
  where account_id=v_account_id and owner_user_id=v_uid and status='pending';

  select coalesce(jsonb_agg(jsonb_build_object(
    'student_ref',s.student_ref,
    'name',coalesce(s.snapshot#>>'{student,name}','طالب')
  ) order by coalesce(s.snapshot#>>'{student,name}','طالب')),'[]'::jsonb)
  into v_students
  from public.guardian_portal_shares s
  where s.guardian_account_id=v_account_id;

  return jsonb_build_object(
    'ok',true,
    'phone_last4',v_last4,
    'students',v_students
  );
end;
$$;

create or replace function public.guardian_portal_reset_request_dismiss(p_request uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from public.app_users u where u.user_id=v_uid and u.status='active') then
    raise exception 'ACTIVE_ACCOUNT_REQUIRED';
  end if;

  update public.guardian_portal_reset_requests
  set status='dismissed',resolved_at=now()
  where id=p_request and owner_user_id=v_uid and status='pending';
  get diagnostics v_count=row_count;

  return jsonb_build_object('ok',v_count>0,'dismissed',v_count>0);
end;
$$;


-- Any teacher-side PIN rotation (including the existing Stage 3 manual reset)
-- automatically closes pending forgot-PIN requests for that guardian account.
create or replace function public.guardian_portal_close_reset_requests_on_pin_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if new.pin_hash is distinct from old.pin_hash then
    update public.guardian_portal_reset_requests
    set status='resolved',resolved_at=now()
    where account_id=new.id and status='pending';
  end if;
  return new;
end;
$$;

drop trigger if exists guardian_portal_close_reset_requests_on_pin_change on public.guardian_portal_accounts;
create trigger guardian_portal_close_reset_requests_on_pin_change
after update of pin_hash on public.guardian_portal_accounts
for each row execute function public.guardian_portal_close_reset_requests_on_pin_change();

revoke all on function public.guardian_portal_close_reset_requests_on_pin_change() from public;

revoke all on function public.guardian_portal_request_pin_reset(text) from public;
revoke all on function public.guardian_portal_reset_requests_list() from public;
revoke all on function public.guardian_portal_reset_request_resolve(uuid,text) from public;
revoke all on function public.guardian_portal_reset_request_dismiss(uuid) from public;

grant execute on function public.guardian_portal_request_pin_reset(text) to anon, authenticated;
grant execute on function public.guardian_portal_reset_requests_list() to authenticated;
grant execute on function public.guardian_portal_reset_request_resolve(uuid,text) to authenticated;
grant execute on function public.guardian_portal_reset_request_dismiss(uuid) to authenticated;

-- Stage 3.3 security notes:
-- • Forgot-PIN responses are generic and do not reveal whether a phone exists.
-- • Public reset requests are limited to 3 accepted requests per phone hash / 24 hours.
-- • Only the owning active teacher can list, resolve, or dismiss requests.
-- • Resolving a request rotates the bcrypt PIN and revokes existing guardian sessions.
-- • No student/session rows are modified and Local Schema remains 12.
