-- 🔁 ملف ظلي مُسترجَع من تاريخ الإنتاج (schema_migrations) — مطابقة 1:1 مع الإنتاج
-- Recovery date: 2026-11-01 · طُبّقت في الإنتاج قبل وجود ملفها محلياً
CREATE OR REPLACE FUNCTION public.check_and_record_ai_usage(
    p_user_id uuid,
    p_daily_limit integer,
    p_image_bytes bigint,
    p_exec_seconds numeric DEFAULT 0,
    p_cost_usd numeric DEFAULT 0,
    p_check_only boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN public.check_and_record_ai_usage(
        p_user_id => p_user_id,
        p_daily_limit => p_daily_limit,
        p_image_bytes => p_image_bytes,
        p_exec_seconds => p_exec_seconds,
        p_cost_usd => p_cost_usd,
        p_check_only => p_check_only,
        p_request_id => NULL
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_record_ai_usage(uuid, integer, bigint, numeric, numeric, boolean) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';