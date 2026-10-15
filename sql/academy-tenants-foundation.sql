-- v11.7.4 — Multi-academy foundation (additive and non-destructive).
-- NO legacy student/session/guardian/finance schema changes. NO legacy RPC changes.
-- Bootstrap one academy for the existing verified, active owner; other users are NOT auto-enrolled.
-- Membership roles are groundwork only: older app data is NOT tenant-isolated yet.
-- Before launching additional academies, migrate all existing per-teacher data/RPCs
-- to tenant-scoped, server-enforced access (later releases).

create table if not exists public.quran_academies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z][a-z0-9-]{2,62}$'),
  display_name text not null check (char_length(display_name) between 3 and 160),
  default_locale text not null default 'ar' check (default_locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  timezone text not null default 'Africa/Cairo' check (char_length(timezone) between 3 and 64),
  status text not null default 'pilot' check (status in ('pilot','active','suspended')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.quran_academy_memberships (
  academy_id uuid not null references public.quran_academies(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','admin','supervisor','teacher')),
  status text not null default 'active' check (status in ('active','invited','disabled')),
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (academy_id,user_id)
);
create index if not exists quran_academy_members_user_idx on public.quran_academy_memberships(user_id,academy_id);
create table if not exists public.quran_academy_branches (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.quran_academies(id),
  slug text not null check (slug ~ '^[a-z][a-z0-9-]{1,62}$'),
  display_name text not null check (char_length(display_name) between 2 and 120),
  status text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now(),
  unique (academy_id,slug)
);
-- This mapping is ONLY an accounting bridge to the existing single-academy owner.
-- The existing student, session, teacher, and portal tables remain untouched.
create table if not exists public.quran_academy_legacy_links (
  academy_id uuid primary key references public.quran_academies(id),
  legacy_owner_user_id uuid not null unique references public.app_users(user_id),
  linked_at timestamptz not null default now()
);
create table if not exists public.quran_academy_access_audit (
  id bigint generated always as identity primary key,
  academy_id uuid not null references public.quran_academies(id),
  actor_user_id uuid not null references auth.users(id),
  action text not null check (action in ('owner_bootstrap','workspace_open')),
  created_at timestamptz not null default now()
);
create index if not exists quran_academy_audit_lookup_idx on public.quran_academy_access_audit(academy_id,created_at desc);

-- No direct browser table access: all future features must use verified RPCs.
alter table public.quran_academies enable row level security;
alter table public.quran_academy_memberships enable row level security;
alter table public.quran_academy_branches enable row level security;
alter table public.quran_academy_legacy_links enable row level security;
alter table public.quran_academy_access_audit enable row level security;
revoke all on public.quran_academies from public, anon, authenticated;
revoke all on public.quran_academy_memberships from public, anon, authenticated;
revoke all on public.quran_academy_branches from public, anon, authenticated;
revoke all on public.quran_academy_legacy_links from public, anon, authenticated;
revoke all on public.quran_academy_access_audit from public, anon, authenticated;
revoke all on sequence public.quran_academy_access_audit_id_seq from public, anon, authenticated;

-- Deterministic, idempotent bootstrap. It does not assign other teachers or move any data.
do $$
declare v_owner uuid; v_academy uuid;
begin
  select user_id into v_owner from public.app_users
  where lower(email)='info.welivequran@gmail.com' and role='owner' and status='active'
  order by created_at limit 1;
  if v_owner is null then raise exception 'ACTIVE_ORIGINAL_OWNER_NOT_FOUND'; end if;
  insert into public.quran_academies(slug,display_name,default_locale,timezone,status,created_by)
  values('imam-academy','أكاديمية الإمام لتحفيظ القرآن الكريم','ar','Africa/Cairo','pilot',v_owner)
  on conflict (slug) do nothing;
  select id into v_academy from public.quran_academies where slug='imam-academy' and created_by=v_owner;
  if v_academy is null then raise exception 'ACADEMY_OWNER_MISMATCH'; end if;
  insert into public.quran_academy_memberships(academy_id,user_id,role,status,granted_by)
  values(v_academy,v_owner,'owner','active',v_owner)
  on conflict (academy_id,user_id) do nothing;
  if not exists (select 1 from public.quran_academy_memberships
    where academy_id=v_academy and user_id=v_owner and role='owner' and status='active')
    then raise exception 'OWNER_MEMBERSHIP_CONFLICT'; end if;
  insert into public.quran_academy_branches(academy_id,slug,display_name)
  values(v_academy,'main','الفرع الرئيسي') on conflict (academy_id,slug) do nothing;
  insert into public.quran_academy_legacy_links(academy_id,legacy_owner_user_id)
  values(v_academy,v_owner) on conflict (academy_id) do nothing;
  if not exists (select 1 from public.quran_academy_legacy_links
    where academy_id=v_academy and legacy_owner_user_id=v_owner)
    then raise exception 'LEGACY_LINK_CONFLICT'; end if;
  if not exists (select 1 from public.quran_academy_access_audit
    where academy_id=v_academy and action='owner_bootstrap') then
    insert into public.quran_academy_access_audit(academy_id,actor_user_id,action)
    values(v_academy,v_owner,'owner_bootstrap');
  end if;
end $$;

-- Capability foundation. This does NOT authorize legacy data access by itself.
create or replace function public.quran_academy_permission(p_academy_id uuid,p_action text)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists (
    select 1 from public.quran_academy_memberships m
    join public.quran_academies a on a.id=m.academy_id
    join public.app_users u on u.user_id=m.user_id
    where m.academy_id=p_academy_id and m.user_id=auth.uid()
      and m.status='active' and u.status='active' and a.status in ('pilot','active')
      and case p_action
        when 'workspace_view' then m.role in ('owner','admin','supervisor','teacher')
        when 'workspace_manage' then m.role='owner'
        when 'team_manage' then m.role in ('owner','admin')
        when 'branch_manage' then m.role in ('owner','admin')
        when 'audit_view' then m.role='owner'
        else false end
  );
$$;

-- Read ONLY the caller's memberships; no client-supplied tenant selector.
create or replace function public.quran_academy_my_workspaces()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object('workspaces',coalesce(jsonb_agg(
    jsonb_build_object('id',a.id,'name',a.display_name,'slug',a.slug,
      'role',m.role,'status',a.status,'locale',a.default_locale,
      'timezone',a.timezone,'legacy_linked',exists(
        select 1 from public.quran_academy_legacy_links l where l.academy_id=a.id
      )) order by a.display_name),'[]'::jsonb))
  from public.quran_academy_memberships m
  join public.quran_academies a on a.id=m.academy_id
  join public.app_users u on u.user_id=m.user_id
  where m.user_id=auth.uid() and m.status='active' and u.status='active'
    and a.status in ('pilot','active');
$$;

-- Server-enforced workspace overview; never returns students, passwords or finances.
create or replace function public.quran_academy_owner_overview(p_academy_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_result jsonb;
begin
  if not public.quran_academy_permission(p_academy_id,'workspace_manage')
    then raise exception 'ACADEMY_OWNER_REQUIRED'; end if;
  select jsonb_build_object('academy_id',a.id,'name',a.display_name,
    'branches',(select count(*) from public.quran_academy_branches b
      where b.academy_id=a.id and b.status='active'),
    'active_members',(select count(*) from public.quran_academy_memberships m
      where m.academy_id=a.id and m.status='active'),
    'migration_status','foundation_only','legacy_records_migrated',false)
  into v_result from public.quran_academies a where a.id=p_academy_id;
  return v_result;
end;
$$;

revoke all on function public.quran_academy_permission(uuid,text) from public,anon,authenticated;
revoke all on function public.quran_academy_my_workspaces() from public,anon,authenticated;
revoke all on function public.quran_academy_owner_overview(uuid) from public,anon,authenticated;
grant execute on function public.quran_academy_permission(uuid,text) to authenticated;
grant execute on function public.quran_academy_my_workspaces() to authenticated;
grant execute on function public.quran_academy_owner_overview(uuid) to authenticated;
