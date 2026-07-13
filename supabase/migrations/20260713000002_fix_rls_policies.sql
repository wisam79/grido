-- =================================================================================
-- Security Fixes: RLS UPDATE policies and RPC Information Leak
-- =================================================================================

-- 1. Fix RLS for profiles: Prevent users from escalating their own plan
DROP POLICY IF EXISTS "تحديث المستخدم لحسابه الخاص أو المشرف يعدل الجميع" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_update_any_profile" ON public.profiles;

CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK (
    (select auth.uid()) = id
    AND plan = OLD.plan      -- Prevent self-escalation
    AND status = OLD.status  -- Prevent status tampering
  );

CREATE POLICY "admin_update_any_profile" ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Add Deny-All INSERT policy for users (profiles are created via trigger)
CREATE POLICY "no_direct_profile_insert" ON public.profiles
  FOR INSERT WITH CHECK (false);

-- 3. Update activate_license RPC to prevent leaking license_key in response
CREATE OR REPLACE FUNCTION public.activate_license(p_key text, p_device_id text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_plan text;
    v_duration integer;
    v_user_id uuid;
    v_profile record;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول أولاً لتفعيل الترخيص';
    END IF;

    SELECT plan, duration_months INTO v_plan, v_duration
    FROM public.license_keys
    WHERE key = p_key AND status = 'unused'
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'مفتاح الترخيص غير صالح أو تم استخدامه مسبقاً';
    END IF;

    UPDATE public.license_keys
    SET status = 'used',
        user_id = v_user_id,
        activated_at = timezone('utc'::text, now())
    WHERE key = p_key;

    UPDATE public.profiles
    SET plan = v_plan,
        status = 'active',
        license_key = p_key,
        expires_at = timezone('utc'::text, now()) + (v_duration || ' months')::interval,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id
    RETURNING plan, status, expires_at INTO v_profile;

    -- Return only the safe subset of data, not the full row
    RETURN row_to_json(v_profile);
END;
$$;
