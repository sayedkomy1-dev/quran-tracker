-- IMAM Beta28 RC16 — teacher-only AI recitation suggestions.
-- Additive migration. Suggestions are not official grades or Quran/tajweed rulings.
create table if not exists public.student_recitation_ai_reviews (
  id uuid primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid not null references public.student_recitation_submissions(id) on delete restrict,
  model_name text not null,
  reference_text text not null default '',
  transcript_candidate text not null default '',
  differences jsonb not null default '[]'::jsonb,
  limitations text not null default '',
  created_at timestamptz not null default now(),
  constraint student_recitation_ai_reference_length check (char_length(reference_text) <= 5000),
  constraint student_recitation_ai_transcript_length check (char_length(transcript_candidate) <= 5000),
  constraint student_recitation_ai_differences_array check (jsonb_typeof(differences)='array' and jsonb_array_length(differences)<=20),
  constraint student_recitation_ai_limitations_length check (char_length(limitations) <= 1000)
);
create index if not exists student_recitation_ai_owner_time_idx on public.student_recitation_ai_reviews(owner_user_id,created_at desc);
create index if not exists student_recitation_ai_submission_time_idx on public.student_recitation_ai_reviews(submission_id,created_at desc);
alter table public.student_recitation_ai_reviews enable row level security;
revoke all on table public.student_recitation_ai_reviews from public, anon, authenticated;
grant all on table public.student_recitation_ai_reviews to service_role;
comment on table public.student_recitation_ai_reviews is 'Teacher-only AI transcription/comparison suggestions. Not official grades, tajweed rulings, or academic records.';
comment on column public.student_recitation_ai_reviews.differences is 'Unverified candidate differences. time_ms is always null; AI is not allowed to invent playback timestamps.';
