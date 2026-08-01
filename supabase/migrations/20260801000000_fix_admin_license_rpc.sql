-- =========================================================================
-- Migration: Fix admin_create_license_key RPC & PostgREST Schema Cache
-- =========================================================================

-- 1. حذف كافة التوقيعات القديمة للدالة لمنع أي تعارض في أطراف PostgREST
DROP FUNCTION IF EXISTS public.admin_create_license_key(text, integer, text);
DROP FUNCTION IF EXISTS public.admin_create_license_key(text, integer);
DROP FUNCTION IF EXISTS public.admin_create_license_key(integer, text);

-- 2. بناء الدالة الرئيسية (3 معاملات مع القيمة الافتراضية)
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
    -- التحقق من صلاحيات الأدمن
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'عملية مرفوضة: تتطلب صلاحيات أدمن';
    END IF;

    IF p_custom_key IS NOT NULL AND length(trim(p_custom_key)) > 0 THEN
        v_key := trim(p_custom_key);
    ELSE
        -- توليد مفتاح ترخيص منظم: GRIDO-PLAN-XXXX-XXXX
        v_key := upper('GRIDO-' || p_plan || '-' || substring(encode(gen_random_bytes(6), 'hex') from 1 for 4) || '-' || substring(encode(gen_random_bytes(6), 'hex') from 5 for 4));
    END IF;

    INSERT INTO public.license_keys (key, plan, duration_months, status)
    VALUES (v_key, p_plan, p_duration_months, 'unused')
    RETURNING key, plan, duration_months, status INTO v_result;

    RETURN row_to_json(v_result);
END;
$$;

-- 3. بناء دالة Overload ذات معاملين لضمان التطابق التام مع استدعاءات PostgREST RPC
CREATE OR REPLACE FUNCTION public.admin_create_license_key(
    p_plan text,
    p_duration_months integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.admin_create_license_key(p_plan, p_duration_months, NULL);
END;
$$;

-- 4. منح الصلاحيات الصريحة لكافة أدوار المستخدمين ومنفذي RPC
GRANT EXECUTE ON FUNCTION public.admin_create_license_key(text, integer, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_license_key(text, integer) TO authenticated, anon, service_role;

-- 5. إعادة تحديث وتنشيط Schema Cache في خادم PostgREST فورياً
NOTIFY pgrst, 'reload schema';
