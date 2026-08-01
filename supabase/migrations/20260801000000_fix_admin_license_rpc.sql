-- =========================================================================
-- Fix Ambiguous Function Overload for admin_create_license_key
-- =========================================================================

-- 1. Drop ALL candidate overloads first to eliminate ambiguity
DROP FUNCTION IF EXISTS public.admin_create_license_key(text, integer);
DROP FUNCTION IF EXISTS public.admin_create_license_key(integer, text);
DROP FUNCTION IF EXISTS public.admin_create_license_key(text, integer, text);

-- 2. Create the single, definitive function with DEFAULT NULL for p_custom_key
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

-- 3. Grant permissions to authenticated, anon, service_role
GRANT EXECUTE ON FUNCTION public.admin_create_license_key(text, integer, text) TO authenticated, anon, service_role;

-- 4. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
