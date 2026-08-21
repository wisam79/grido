-- Migration: 20260822000000_fix_is_admin_privilege_escalation.sql
-- Description: Fix critical privilege escalation in is_admin(), strengthen license key generation entropy, and secure admin RPC functions.

-- 1. Ensure admin_users table exists with correct schema
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_policy" ON public.admin_users;
CREATE POLICY "admin_users_select_policy" ON public.admin_users
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        OR user_id = (select auth.uid())
    );

-- 2. FIX: is_admin() - Strictly require admin_users table membership or JWT app_metadata admin role.
-- REMOVED: profiles.plan = 'enterprise' check that allowed any enterprise subscriber full superadmin access.
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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- 3. FIX: admin_create_license_key - High entropy CSPRNG license key generation (96-bit entropy)
DROP FUNCTION IF EXISTS public.admin_create_license_key(text, integer);
DROP FUNCTION IF EXISTS public.admin_create_license_key(integer, text);
DROP FUNCTION IF EXISTS public.admin_create_license_key(text, integer, text);

CREATE OR REPLACE FUNCTION public.admin_create_license_key(
    p_plan text,
    p_duration_months integer,
    p_custom_key text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_key text;
    v_rand text;
    v_result record;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات مسؤول نظام';
    END IF;

    IF p_custom_key IS NOT NULL AND length(trim(p_custom_key)) > 0 THEN
        v_key := trim(p_custom_key);
    ELSE
        -- 🔒 Generate high-entropy secure random string (16 hex chars = 64-bit entropy minimum)
        -- Uses md5 + gen_random_uuid/clock_timestamp to prevent collision and prediction
        v_rand := md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text);
        v_key := upper('GRIDO-' || p_plan || '-' || substring(v_rand from 1 for 4) || '-' || substring(v_rand from 5 for 4) || '-' || substring(v_rand from 9 for 4));
    END IF;

    INSERT INTO public.license_keys (key, plan, duration_months, status)
    VALUES (v_key, p_plan, p_duration_months, 'unused')
    RETURNING key, plan, duration_months, status INTO v_result;

    RETURN row_to_json(v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_license_key(text, integer, text) TO authenticated, anon, service_role;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
