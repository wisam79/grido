-- =================================================================================
-- Migration: 20260725000001_security_audit_hardening.sql
-- Goal: Fix quota bypass vulnerability in check_and_record_ai_usage, sanitize
--       ensure_profile_exists permissions & payload, and prevent profile field
--       tampering in RLS UPDATE policy.
-- =================================================================================

-- 1. Fix Quota Bypass in check_and_record_ai_usage RPC
-- Server determines daily limit bound based on user plan instead of trusting client param
CREATE OR REPLACE FUNCTION public.check_and_record_ai_usage(
    p_user_id uuid,
    p_daily_limit integer,
    p_image_bytes bigint,
    p_exec_seconds numeric DEFAULT 0,
    p_cost_usd numeric DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count integer;
    v_user_plan text;
    v_effective_limit integer;
BEGIN
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.is_admin()) THEN
        RAISE EXCEPTION 'غير مصرح للقيام بهذه العملية';
    END IF;

    -- Fetch actual user plan from profiles table
    SELECT plan INTO v_user_plan
    FROM public.profiles
    WHERE id = p_user_id;

    -- Enforce maximum quota allowed by plan tier to prevent client manipulation
    CASE v_user_plan
        WHEN 'pro' THEN v_effective_limit := LEAST(p_daily_limit, 200);
        WHEN 'enterprise' THEN v_effective_limit := LEAST(p_daily_limit, 1000);
        ELSE v_effective_limit := LEAST(p_daily_limit, 20); -- free / trial default limit
    END CASE;

    SELECT COUNT(*) INTO v_count
    FROM public.ai_usage
    WHERE user_id = p_user_id
      AND used_at >= date_trunc('day', timezone('utc'::text, now()));

    IF v_count >= v_effective_limit THEN
        RAISE EXCEPTION 'تجاوزت الحد اليومي لاستخدام الذكاء الاصطناعي (%/% طلبات اليوم)', v_count, v_effective_limit;
    END IF;

    INSERT INTO public.ai_usage (user_id, image_bytes, execution_seconds, cost_usd)
    VALUES (p_user_id, p_image_bytes, p_exec_seconds, p_cost_usd);

    RETURN json_build_object(
        'success', true,
        'used_today', v_count + 1,
        'daily_limit', v_effective_limit
    );
END;
$$;

-- 2. Harden ensure_profile_exists RPC (Revoke PUBLIC/anon access, sanitize payload & handle email conflicts)
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_name text;
  v_profile record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول أولاً';
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1))
  INTO v_email, v_name
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود في نظام الهوية';
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, name, email, plan, expires_at, status)
    VALUES (
      v_user_id,
      v_name,
      v_email,
      'trial',
      timezone('utc'::text, now()) + interval '7 days',
      'active'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    -- Ignore email uniqueness collisions if profile already exists for email
    NULL;
  END;

  -- Do not return sensitive license_key field
  SELECT plan, expires_at, status INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  RETURN row_to_json(v_profile);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_profile_exists() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_profile_exists() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists() TO authenticated;

-- 3. Harden update_own_profile RLS Policy to prevent tampering with expires_at & license_key
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;

CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK (
    (select auth.uid()) = id
    AND plan = OLD.plan                                                -- Prevent self-escalation
    AND status = OLD.status                                            -- Prevent status tampering
    AND expires_at IS NOT DISTINCT FROM OLD.expires_at                 -- Prevent expiration extension tampering
    AND license_key IS NOT DISTINCT FROM OLD.license_key               -- Prevent direct license_key insertion
  );
