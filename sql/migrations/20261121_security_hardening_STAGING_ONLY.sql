-- IMAM beta.28 rc.7 - manually reviewed STAGING-ONLY candidate.
-- DO NOT RUN ON PRODUCTION WITHOUT SUPABASE STAGING E2E, ROLLBACK, AND OWNER APPROVAL.
-- Dependencies: sql/auth-access.sql and sql/guardian-portal-login.sql are already installed.
-- No DROP TABLE, no deletion of any student, sessions or payment history.
BEGIN;

-- F5. The owner email is not enough: require a verified Google identity.
CREATE OR REPLACE FUNCTION public.handle_new_app_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email text := lower(coalesce(new.email,''));
  v_name text := coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(coalesce(new.email,''),'@',1));
  v_is_owner boolean := lower(coalesce(new.email,''))='info.welivequran@gmail.com'
    AND new.email_confirmed_at IS NOT NULL
    AND coalesce(new.raw_app_meta_data->>'provider','')='google';
BEGIN
  INSERT INTO public.app_users(user_id,email,display_name,role,status,created_at,approved_at)
  VALUES (new.id,v_email,v_name,
    CASE WHEN v_is_owner THEN 'owner' ELSE 'teacher' END,
    CASE WHEN v_is_owner THEN 'active' ELSE 'pending' END,
    now(),CASE WHEN v_is_owner THEN now() ELSE null END)
  ON CONFLICT (user_id) DO UPDATE
  SET email=excluded.email,
      display_name=CASE WHEN public.app_users.display_name='' THEN excluded.display_name ELSE public.app_users.display_name END,
      role=CASE WHEN v_is_owner THEN 'owner' ELSE public.app_users.role END,
      status=CASE WHEN v_is_owner THEN 'active' ELSE public.app_users.status END,
      approved_at=CASE WHEN v_is_owner THEN coalesce(public.app_users.approved_at,now()) ELSE public.app_users.approved_at END;
  RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_app_user() FROM public;

-- F3. Avoid telling callers whether a phone is known, and avoid giving attackers
-- a simple phone-based hard-lock switch. This is NOT a replacement for edge
-- rate-limiting/CAPTCHA, which must be configured separately before rollout.
CREATE OR REPLACE FUNCTION public.guardian_portal_login(p_phone text,p_pin text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_phone_hash text;
  v_guard public.guardian_portal_login_guard%rowtype;
  v_account_exists boolean := false;
  v_accounts uuid[];
  v_attempts integer := 0;
  v_session public.guardian_portal_sessions%rowtype;
  v_started timestamptz := clock_timestamp();
  -- Fixed bcrypt hash for a harmless dummy PIN. Never return credential state.
  v_dummy_hash text := '$2a$10$N9qo8uLOickgx2ZMRZoMye7B1x1F1uS46HoPazTAp3GEXUXMaLLGi';
BEGIN
  BEGIN
    v_phone_hash := public.guardian_portal_phone_hash(p_phone);
  EXCEPTION WHEN others THEN
    perform pg_sleep(0.55);
    RETURN jsonb_build_object('ok',false,'error','INVALID_CREDENTIALS');
  END;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{6}$' THEN
    perform pg_sleep(0.55);
    RETURN jsonb_build_object('ok',false,'error','INVALID_CREDENTIALS');
  END IF;

  -- Persist a guard record for both registered and unregistered phone numbers.
  INSERT INTO public.guardian_portal_login_guard(phone_hash,failed_attempts,window_started_at,locked_until,updated_at)
  VALUES(v_phone_hash,0,now(),null,now()) ON CONFLICT(phone_hash) DO NOTHING;
  SELECT * INTO v_guard FROM public.guardian_portal_login_guard
  WHERE phone_hash=v_phone_hash FOR UPDATE;
  IF v_guard.window_started_at < now()-interval '15 minutes' THEN
    UPDATE public.guardian_portal_login_guard
    SET failed_attempts=0,window_started_at=now(),locked_until=null,updated_at=now()
    WHERE phone_hash=v_phone_hash;
    v_attempts := 0;
  ELSE
    v_attempts := coalesce(v_guard.failed_attempts,0);
  END IF;

  SELECT exists(
    SELECT 1 FROM public.guardian_portal_accounts a
    WHERE a.phone_hash=v_phone_hash AND a.disabled_at IS NULL
      AND exists(SELECT 1 FROM public.app_users u WHERE u.user_id=a.owner_user_id AND u.status='active')
      AND exists(SELECT 1 FROM public.guardian_portal_shares s WHERE s.guardian_account_id=a.id)
  ) INTO v_account_exists;
  IF NOT v_account_exists THEN
    PERFORM crypt(p_pin,v_dummy_hash); -- simulate credential check on missing accounts
  END IF;

  SELECT array_agg(a.id ORDER BY a.id) INTO v_accounts
  FROM public.guardian_portal_accounts a
  WHERE a.phone_hash=v_phone_hash AND a.disabled_at IS NULL
    AND a.pin_hash=crypt(p_pin,a.pin_hash)
    AND exists(SELECT 1 FROM public.app_users u WHERE u.user_id=a.owner_user_id AND u.status='active')
    AND exists(SELECT 1 FROM public.guardian_portal_shares s WHERE s.guardian_account_id=a.id);

  IF v_accounts IS NULL OR cardinality(v_accounts)=0 THEN
    v_attempts:=v_attempts+1;
    UPDATE public.guardian_portal_login_guard
    SET failed_attempts=v_attempts,locked_until=null,updated_at=now()
    WHERE phone_hash=v_phone_hash;
    PERFORM pg_sleep(greatest(0,0.55-extract(epoch FROM clock_timestamp()-v_started))
      + least(1.5,greatest(0,v_attempts-3)*0.15));
    RETURN jsonb_build_object('ok',false,'error','INVALID_CREDENTIALS');
  END IF;

  UPDATE public.guardian_portal_login_guard
  SET failed_attempts=0,window_started_at=now(),locked_until=null,updated_at=now()
  WHERE phone_hash=v_phone_hash;
  INSERT INTO public.guardian_portal_sessions(account_ids)
  VALUES(v_accounts) RETURNING * INTO v_session;
  PERFORM pg_sleep(greatest(0,0.55-extract(epoch FROM clock_timestamp()-v_started)));
  RETURN jsonb_build_object('ok',true,'session_token',v_session.session_token,
    'expires_at',v_session.expires_at,'account_count',cardinality(v_accounts));
END;
$$;
REVOKE ALL ON FUNCTION public.guardian_portal_login(text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.guardian_portal_login(text,text) TO anon,authenticated;

-- F9. Administrator-only scheduled maintenance hook. Invoking this function is
-- a deliberate operator action; no cron/scheduled job is installed silently.
CREATE OR REPLACE FUNCTION public.guardian_security_cleanup_expired()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE v_sessions integer := 0;v_guards integer := 0;
BEGIN
  DELETE FROM public.guardian_portal_sessions WHERE expires_at < now()-interval '1 day';
  GET DIAGNOSTICS v_sessions = ROW_COUNT;
  DELETE FROM public.guardian_portal_login_guard
  WHERE updated_at < now()-interval '1 day'
    AND (locked_until IS NULL OR locked_until<now());
  GET DIAGNOSTICS v_guards = ROW_COUNT;
  RETURN jsonb_build_object('sessions',v_sessions,'guards',v_guards);
END;
$$;
REVOKE ALL ON FUNCTION public.guardian_security_cleanup_expired() FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guardian_security_cleanup_expired() TO service_role;
COMMIT;
