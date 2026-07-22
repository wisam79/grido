-- =================================================================================
-- Migration: 20260721000000_ai_usage_and_security.sql
-- Goal: Separate admin role from enterprise plan, add AI usage tracking & quota,
--       and protect administrative RPC operations.
-- =================================================================================

-- 1. Create dedicated admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_users_select_policy" ON public.admin_users
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR user_id = (select auth.uid())
    );

-- Seed initial admin user if present in profiles
INSERT INTO public.admin_users (user_id)
VALUES ('b2943199-cb11-4adc-9275-5a746aab879c')
ON CONFLICT (user_id) DO NOTHING;

-- 2. Update is_admin() function to use JWT app_metadata OR admin_users table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (select auth.uid())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. Create ai_usage table for tracking daily quota and cost
CREATE TABLE IF NOT EXISTS public.ai_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    used_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    image_bytes bigint NOT NULL DEFAULT 0,
    execution_seconds numeric(6,2) DEFAULT 0,
    cost_usd numeric(8,6) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_usage(user_id, used_at);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_usage_select_own_or_admin" ON public.ai_usage
    FOR SELECT USING (
        user_id = (select auth.uid()) OR public.is_admin()
    );

CREATE POLICY "ai_usage_insert_service" ON public.ai_usage
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR public.is_admin()
    );

-- 4. Function: Check and record AI usage atomically
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
BEGIN
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.is_admin()) THEN
        RAISE EXCEPTION 'غير مصرح للقيام بهذه العملية';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.ai_usage
    WHERE user_id = p_user_id
      AND used_at >= date_trunc('day', timezone('utc'::text, now()));

    IF v_count >= p_daily_limit THEN
        RAISE EXCEPTION 'تجاوزت الحد اليومي لاستخدام الذكاء الاصطناعي (%/% طلبات اليوم)', v_count, p_daily_limit;
    END IF;

    INSERT INTO public.ai_usage (user_id, image_bytes, execution_seconds, cost_usd)
    VALUES (p_user_id, p_image_bytes, p_exec_seconds, p_cost_usd);

    RETURN json_build_object(
        'success', true,
        'used_today', v_count + 1,
        'daily_limit', p_daily_limit
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage TO authenticated;

-- 5. RPC Functions for Admin Operations
CREATE OR REPLACE FUNCTION public.admin_create_license_key(
    p_plan text,
    p_duration_months integer,
    p_custom_key text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key text;
    v_result record;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات أدمن';
    END IF;

    IF p_custom_key IS NOT NULL AND length(trim(p_custom_key)) > 0 THEN
        v_key := trim(p_custom_key);
    ELSE
        -- Generate random 16-char key
        v_key := upper(substring(encode(gen_random_bytes(12), 'hex') from 1 for 16));
    END IF;

    INSERT INTO public.license_keys (key, plan, duration_months, status)
    VALUES (v_key, p_plan, p_duration_months, 'unused')
    RETURNING key, plan, duration_months, status INTO v_result;

    RETURN row_to_json(v_result);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_extend_license(
    p_user_id uuid,
    p_additional_months integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile record;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات أدمن';
    END IF;

    UPDATE public.profiles
    SET expires_at = COALESCE(expires_at, timezone('utc'::text, now())) + (p_additional_months || ' months')::interval,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id
    RETURNING id, plan, status, expires_at INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المستخدم غير موجود';
    END IF;

    RETURN row_to_json(v_profile);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_license(
    p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile record;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات أدمن';
    END IF;

    UPDATE public.profiles
    SET status = 'expired',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id
    RETURNING id, plan, status, expires_at INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المستخدم غير موجود';
    END IF;

    RETURN row_to_json(v_profile);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_license_key TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_extend_license TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_license TO authenticated;
