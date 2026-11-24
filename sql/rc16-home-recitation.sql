-- IMAM Beta28 RC16 — Home Recitation & Teacher Feedback
-- Additive backend migration. Does not alter Local Schema 12 or existing academic records.
-- The private bucket is accessed only through the guardian-recitation Edge Function.
-- Never put the Supabase service-role key in browser code.

create table if not exists public.student_recitation_submissions (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  guardian_account_id uuid references public.guardian_portal_accounts(id) on delete set null,
  student_ref text not null,
  session_token_hash text not null,
  surah_no smallint not null,
  ayah_from smallint not null,
  ayah_to smallint not null,
  student_note text not null default '',
  mime_type text not null,
  file_size_bytes bigint not null default 0,
  duration_ms integer not null default 0,
  storage_path text not null unique,
  status text not null default 'uploading',
  created_at timestamptz not null default now(),
  uploaded_at timestamptz,
  reviewed_at timestamptz,
  archived_at timestamptz,
  constraint student_recitation_student_ref_format check (student_ref ~ '^[0-9a-f]{64}$'),
  constraint student_recitation_session_hash_format check (session_token_hash ~ '^[0-9a-f]{64}$'),
  constraint student_recitation_surah_range check (surah_no between 1 and 114),
  constraint student_recitation_ayah_range check (ayah_from >= 1 and ayah_to >= ayah_from),
  constraint student_recitation_note_length check (char_length(student_note) <= 500),
  constraint student_recitation_mime_allowed check (mime_type in ('audio/webm','audio/mp4','audio/ogg','audio/wav','audio/mpeg','audio/aac')),
  constraint student_recitation_size_limit check (file_size_bytes between 0 and 20971520),
  constraint student_recitation_duration_limit check (duration_ms between 0 and 1200000),
  constraint student_recitation_path_format check (storage_path ~ '^recitations/[0-9a-f-]{36}/[0-9a-f]{64}/[0-9a-f-]{36}\.(webm|m4a|ogg|wav|mp3|aac)$'),
  constraint student_recitation_status_allowed check (status in ('uploading','submitted','reviewing','feedback_ready','archived'))
);

create index if not exists student_recitation_owner_student_time_idx
  on public.student_recitation_submissions(owner_user_id,student_ref,created_at desc);
create index if not exists student_recitation_status_time_idx
  on public.student_recitation_submissions(owner_user_id,status,created_at desc);
create index if not exists student_recitation_session_hash_idx
  on public.student_recitation_submissions(session_token_hash);

alter table public.student_recitation_submissions enable row level security;
revoke all on table public.student_recitation_submissions from public, anon, authenticated;
grant all on table public.student_recitation_submissions to service_role;

create table if not exists public.student_recitation_feedback (
  id uuid primary key,
  submission_id uuid not null references public.student_recitation_submissions(id) on delete restrict,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  student_feedback text not null default '',
  teacher_private_note text not null default '',
  annotations jsonb not null default '[]'::jsonb,
  audio_path text,
  student_visible boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint student_recitation_feedback_text_length check (char_length(student_feedback) <= 2000),
  constraint student_recitation_private_note_length check (char_length(teacher_private_note) <= 2000),
  constraint student_recitation_annotations_array check (
    jsonb_typeof(annotations)='array' and jsonb_array_length(annotations)<=50
  ),
  constraint student_recitation_feedback_audio_path check (
    audio_path is null or audio_path ~ '^feedback/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(webm|m4a|ogg|wav|mp3|aac)$'
  ),
  constraint student_recitation_feedback_publish_time check (
    (student_visible and published_at is not null) or (not student_visible)
  )
);

create index if not exists student_recitation_feedback_submission_time_idx
  on public.student_recitation_feedback(submission_id,created_at desc);
create index if not exists student_recitation_feedback_owner_time_idx
  on public.student_recitation_feedback(owner_user_id,created_at desc);

alter table public.student_recitation_feedback enable row level security;
revoke all on table public.student_recitation_feedback from public, anon, authenticated;
grant all on table public.student_recitation_feedback to service_role;

-- Private bucket: no direct browser policies are created.
-- All upload, playback URL minting, and authorization happen inside the Edge Function.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'imam-home-recitations',
  'imam-home-recitations',
  false,
  20971520,
  array['audio/webm','audio/mp4','audio/ogg','audio/wav','audio/mpeg','audio/aac']::text[]
)
on conflict (id) do update
set name=excluded.name,
    public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

comment on table public.student_recitation_submissions is
  'RC16 home recitation submissions. Private service-role access only; never delete student history as part of routine cleanup.';
comment on table public.student_recitation_feedback is
  'RC16 teacher feedback. teacher_private_note is never returned to student/guardian clients.';
comment on column public.student_recitation_submissions.session_token_hash is
  'SHA-256 of the temporary guardian portal session token; the raw token is never stored with a submission.';
comment on column public.student_recitation_feedback.annotations is
  'Teacher-authored annotations with actual playback time_ms, optional ayah_no, and note.';

-- Security contract:
-- • RLS is enabled and anon/authenticated have no table grants.
-- • The bucket is private and has no anon/authenticated storage.objects policies.
-- • The Edge Function validates the guardian session or teacher JWT on every request.
-- • Service-role credentials exist only in Supabase Edge Function secrets.
-- • Audio is never deleted after upload; archive is a reversible status change.
-- • Local Schema remains 12; all existing audio/WhatsApp flows remain untouched.
