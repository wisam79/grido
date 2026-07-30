-- =================================================================================
-- Migration: 20260729000000_fix_is_admin_permissions.sql
-- Goal: Fix EXECUTE permissions for is_admin() and check_and_record_ai_usage()
--       to prevent PostgREST schema cache error PGRST202 / 42501.
-- =================================================================================

-- 0. Ensure admin_users table exists
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_policy" ON public.admin_users;
CREATE POLICY "admin_users_select_policy" ON public.admin_users
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR user_id = (select auth.uid())
    );

-- 1. Grant EXECUTE permissions on is_admin to prevent RLS schema introspection error 42501
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND plan = 'enterprise'
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (select auth.uid())
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- 2. Ensure ai_usage table exists and RLS policy allows insert/select
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

DROP POLICY IF EXISTS "ai_usage_select_own_or_admin" ON public.ai_usage;
CREATE POLICY "ai_usage_select_own_or_admin" ON public.ai_usage
    FOR SELECT USING (
        user_id = (select auth.uid()) OR public.is_admin()
    );

DROP POLICY IF EXISTS "ai_usage_insert_service" ON public.ai_usage;
CREATE POLICY "ai_usage_insert_service" ON public.ai_usage
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR public.is_admin() OR user_id = (select auth.uid())
    );

-- 3. Create or replace check_and_record_ai_usage RPC
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

GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage TO authenticated, anon, service_role;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
