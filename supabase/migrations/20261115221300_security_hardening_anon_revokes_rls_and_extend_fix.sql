-- تقوية صلاحيات مخطط public وسياسات profiles وتحصين admin_extend_license:
-- 1) سحب EXECUTE من PUBLIC و anon على الدوال الثماني ذات SECURITY DEFINER
-- 2) تقليص منح الجداول الخمسة إلى أقل امتياز مطلوب وسحب TRUNCATE/REFERENCES/TRIGGER
-- 3) تشديد الصلاحيات الافتراضية (ALTER DEFAULT PRIVILEGES) للكائنات المستقبلية
-- 4) دمج سياسَتَي UPDATE على public.profiles في سياسة واحدة لـ authenticated
-- 5) منع القيم غير الموجبة وتمديد التراخيص المنتهية من now() في admin_extend_license

-- 1. Revoke PUBLIC & anon EXECUTE on all 8 exposed SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_session(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.claim_session(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_session(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean, uuid, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.cancel_ai_quota_reservation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_ai_quota_reservation(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_create_license_key(text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_license_key(text, integer, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_extend_license(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_license(text, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.admin_revoke_license(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_license(text) TO authenticated, service_role;

-- 2. Least-privilege table grants across all public tables
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_users TO authenticated;
GRANT ALL ON TABLE public.admin_users TO service_role;

REVOKE ALL ON TABLE public.ai_usage FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.ai_usage TO authenticated;
GRANT ALL ON TABLE public.ai_usage TO service_role;

REVOKE ALL ON TABLE public.license_keys FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.license_keys TO authenticated;
GRANT ALL ON TABLE public.license_keys TO service_role;

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

REVOKE ALL ON TABLE public.user_sessions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.user_sessions TO service_role;

-- 3. Tighten default ACLs for future objects created by postgres in public
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon;

-- 4. Merge multiple permissive UPDATE policies on public.profiles into one policy
DROP POLICY IF EXISTS "admin_update_any_profile" ON public.profiles;
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (((SELECT auth.uid()) = id) OR public.is_admin())
  WITH CHECK (((SELECT auth.uid()) = id) OR public.is_admin());

-- 5. Harden admin_extend_license: positive bounded months & GREATEST(expires_at, now())
CREATE OR REPLACE FUNCTION public.admin_extend_license(p_user_id text, p_additional_months integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_profile record;
    v_user_uuid uuid;
    v_now timestamptz := now();
BEGIN
    IF public.is_admin() IS NOT TRUE THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات أدمن';
    END IF;

    IF p_additional_months IS NULL OR p_additional_months <= 0 OR p_additional_months > 1200 THEN
        RAISE EXCEPTION 'عدد أشهر التمديد غير صالح (يجب أن يكون بين 1 و 1200)';
    END IF;

    v_user_uuid := p_user_id::uuid;

    UPDATE public.profiles
    SET expires_at = GREATEST(COALESCE(expires_at, v_now), v_now) + make_interval(months => p_additional_months),
        status = 'active',
        updated_at = v_now
    WHERE id = v_user_uuid
    RETURNING id, plan, status, expires_at INTO v_profile;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المستخدم غير موجود';
    END IF;

    RETURN row_to_json(v_profile);
END;
$function$;

NOTIFY pgrst, 'reload schema';
