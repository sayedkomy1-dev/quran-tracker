-- RC30.1: additive permission repair for the existing RC30 RPC.
-- Apply after RC30, first in staging. No data changes.
BEGIN;
-- The existing function checks auth.uid(), active owner/teacher status,
-- scopes every row to that actor, serializes writes and rejects empty rosters.
REVOKE ALL ON FUNCTION public.app_teacher_roster_publish_safe_v1(jsonb,uuid,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_teacher_roster_publish_safe_v1(jsonb,uuid,text[]) TO authenticated;
COMMIT;
