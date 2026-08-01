-- =========================================================================
-- Master E2E Migration: Fix All Admin RPC Functions & PostgREST Schema Cache
-- =========================================================================

-- 1. FIX: admin_extend_license (Text & UUID Overloads)
DROP FUNCTION IF EXISTS public.admin_extend_license(uuid, integer);
DROP FUNCTION IF EXISTS public.admin_extend_license(text, integer);
DROP FUNCTION IF EXISTS public.admin_extend_license(integer, uuid);
DROP FUNCTION IF EXISTS public.admin_extend_license(integer, text);

CREATE OR REPLACE FUNCTION public.admin_extend_license(
    p_user_id text,
    p_additional_months integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile record;
    v_user_uuid uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات أدمن';
    END IF;

    v_user_uuid := p_user_id::uuid;

    UPDATE public.profiles
    SET expires_at = COALESCE(expires_at, timezone('utc'::text, now())) + (p_additional_months || ' months')::interval,
        status = 'active',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_uuid
    RETURNING id, plan, status, expires_at INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المستخدم غير موجود';
    END IF;

    RETURN row_to_json(v_profile);
END;
$$;

-- 2. FIX: admin_revoke_license (Text & UUID Overloads)
DROP FUNCTION IF EXISTS public.admin_revoke_license(uuid);
DROP FUNCTION IF EXISTS public.admin_revoke_license(text);

CREATE OR REPLACE FUNCTION public.admin_revoke_license(
    p_user_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile record;
    v_user_uuid uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات أدمن';
    END IF;

    v_user_uuid := p_user_id::uuid;

    UPDATE public.profiles
    SET status = 'expired',
        plan = 'free',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_uuid
    RETURNING id, plan, status, expires_at INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المستخدم غير موجود';
    END IF;

    RETURN row_to_json(v_profile);
END;
$$;

-- 3. FIX: admin_create_license_key (Standard PostgreSQL Function)
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
SET search_path = public
AS $$
DECLARE
    v_key text;
    v_rand text;
    v_result record;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات أدمن';
    END IF;

    IF p_custom_key IS NOT NULL AND length(trim(p_custom_key)) > 0 THEN
        v_key := trim(p_custom_key);
    ELSE
        v_rand := md5(random()::text || clock_timestamp()::text);
        v_key := upper('GRIDO-' || p_plan || '-' || substring(v_rand from 1 for 4) || '-' || substring(v_rand from 5 for 4));
    END IF;

    INSERT INTO public.license_keys (key, plan, duration_months, status)
    VALUES (v_key, p_plan, p_duration_months, 'unused')
    RETURNING key, plan, duration_months, status INTO v_result;

    RETURN row_to_json(v_result);
END;
$$;

-- 4. GRANT EXECUTE Permissions across all roles for all admin RPC functions
GRANT EXECUTE ON FUNCTION public.admin_extend_license(text, integer) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revoke_license(text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_license_key(text, integer, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- 5. RELOAD PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
