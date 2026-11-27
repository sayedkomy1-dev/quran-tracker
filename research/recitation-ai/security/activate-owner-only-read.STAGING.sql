-- STAGING ONLY: activate AFTER the guardian UI has moved to the tested signer.
-- No table, bucket, recording or other policy is deleted.
begin;
create or replace function public.guardian_home_recitation_can_read(p_name text)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$
 select auth.uid() is not null
 and exists(select 1 from public.app_users u where u.user_id=auth.uid() and u.status='active')
 and (
  exists(select 1 from public.guardian_home_recitations r
   where r.owner_user_id=auth.uid() and r.object_path=p_name
     and r.status in ('submitted','reviewed','needs_retry'))
  or exists(select 1 from public.guardian_home_recitation_comments c
   join public.guardian_home_recitations r on r.id=c.recording_id
   where c.owner_user_id=auth.uid() and r.owner_user_id=auth.uid()
     and c.audio_path=p_name and c.audio_status='ready')
 );
$$;
revoke all on function public.guardian_home_recitation_can_read(text) from public;
grant execute on function public.guardian_home_recitation_can_read(text) to anon,authenticated;
commit;
